import { expect, test } from '@playwright/test'
import { ConnectionStatus, RepoProvider, type components } from '@stackbox/contract'
import { orgPath, type Session, signIn } from './support'

type Schemas = components['schemas']

const ADMIN = { email: 'ada@example.com', password: 'password' }
const MEMBER = { email: 'dev@example.com', password: 'password' }

async function repositoriesOf(session: Session): Promise<Schemas['Repository'][]> {
  const list: Schemas['RepositoryList'] = await (await session.api.get(orgPath(session, '/repositories'))).json()
  return list.items
}

async function repositoryNamed(session: Session, fullName: string): Promise<Schemas['Repository']> {
  return (await repositoriesOf(session)).filter((item) => item.full_name === fullName)[0]
}

async function connectionNamed(session: Session, login: string): Promise<Schemas['GitConnection']> {
  const list: Schemas['GitConnectionList'] = await (await session.api.get(orgPath(session, '/git-connections'))).json()
  return list.items.filter((item) => item.account_login === login)[0]
}

test.describe.configure({ mode: 'serial' })

test('the repository list names the applications each repository backs', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)

  const shop = await repositoryNamed(admin, 'acme/shop')

  expect(shop.used_by.map((application) => application.name)).toEqual(['shop', 'shop-admin'])
})

test('an admin adds a repository the connection lists and the organization has not added', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const acme = await connectionNamed(admin, 'acme')
  const available: Schemas['AvailableRepositoryList'] = await (
    await admin.api.get(orgPath(admin, `/git-connections/${acme.id}/available-repositories`))
  ).json()

  const response = await admin.api.post(orgPath(admin, '/repositories'), { data: { connection_id: acme.id, external_ids: ['gh-1004'] } })

  const added: Schemas['RepositoryList'] = await response.json()
  expect({ offered: available.items.map((item) => item.external_id), status: response.status(), added: added.items.map((item) => item.full_name) }).toEqual({
    offered: ['gh-1004', 'gh-1005', 'gh-1006'],
    status: 201,
    added: ['acme/acme-api'],
  })
})

test('removing a repository that backs applications answers 409 naming them', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const shop = await repositoryNamed(admin, 'acme/shop')

  const response = await admin.api.delete(orgPath(admin, `/repositories/${shop.id}`))

  const body: Schemas['RepositoryInUse'] = await response.json()
  expect({ status: response.status(), code: body.code, applications: body.applications.map((application) => application.name) }).toEqual({
    status: 409,
    code: 'repository_in_use',
    applications: ['shop', 'shop-admin'],
  })
})

test('removing a repository no application backs answers 204 and drops it from the list', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const added = await repositoryNamed(admin, 'acme/acme-api')

  const response = await admin.api.delete(orgPath(admin, `/repositories/${added.id}`))

  const listed = (await repositoriesOf(admin)).some((item) => item.full_name === 'acme/acme-api')
  expect({ status: response.status(), listed }).toEqual({ status: 204, listed: false })
})

test('an OrgMember cannot add repositories', async ({ playwright, baseURL }) => {
  const member = await signIn(playwright, baseURL, MEMBER)
  const acme = await connectionNamed(member, 'acme')

  const response = await member.api.post(orgPath(member, '/repositories'), { data: { connection_id: acme.id, external_ids: ['gh-1005'] } })

  expect(response.status()).toBe(403)
})

test('connecting an account the provider refuses answers 400 connection_failed', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)

  const response = await admin.api.post(orgPath(admin, '/git-connections'), {
    data: { provider: RepoProvider.Github, account_login: 'needs-reauth' },
  })

  expect({ status: response.status(), code: (await response.json()).code }).toEqual({ status: 400, code: 'connection_failed' })
})

test('verifying a connection the provider refuses records error', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const refused = await connectionNamed(admin, 'needs-reauth')

  const response = await admin.api.post(orgPath(admin, `/git-connections/${refused.id}/verify`))

  const answered: Schemas['GitConnection'] = await response.json()
  expect({ status: response.status(), connection: answered.status }).toEqual({ status: 200, connection: ConnectionStatus.Error })
})
