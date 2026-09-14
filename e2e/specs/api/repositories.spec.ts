import { type APIRequestContext, expect, test } from '@playwright/test'
import { ConnectionStatus, RepoProvider, type components } from '@stackbox/contract'
import { bearer, type Session, signIn } from './support'

type Schemas = components['schemas']

const ADMIN = { email: 'ada@example.com', password: 'password' }
const MEMBER = { email: 'dev@example.com', password: 'password' }

const orgPath = (session: Session, path: string) => `/api/v1/organizations/${session.user.organisation_id}${path}`

async function repositoriesOf(request: APIRequestContext, session: Session): Promise<Schemas['Repository'][]> {
  const list: Schemas['RepositoryList'] = await (await request.get(orgPath(session, '/repositories'), { headers: bearer(session) })).json()
  return list.items
}

async function repositoryNamed(request: APIRequestContext, session: Session, fullName: string): Promise<Schemas['Repository']> {
  return (await repositoriesOf(request, session)).filter((item) => item.full_name === fullName)[0]
}

async function connectionNamed(request: APIRequestContext, session: Session, login: string): Promise<Schemas['GitConnection']> {
  const list: Schemas['GitConnectionList'] = await (await request.get(orgPath(session, '/git-connections'), { headers: bearer(session) })).json()
  return list.items.filter((item) => item.account_login === login)[0]
}

test.describe.configure({ mode: 'serial' })

test('the repository list names the applications each repository backs', async ({ request }) => {
  const admin = await signIn(request, ADMIN)

  const shop = await repositoryNamed(request, admin, 'acme/shop')

  expect(shop.used_by.map((application) => application.name)).toEqual(['shop', 'shop-admin'])
})

test('an admin adds a repository the connection lists and the organization has not added', async ({ request }) => {
  const admin = await signIn(request, ADMIN)
  const acme = await connectionNamed(request, admin, 'acme')
  const available: Schemas['AvailableRepositoryList'] = await (
    await request.get(orgPath(admin, `/git-connections/${acme.id}/available-repositories`), { headers: bearer(admin) })
  ).json()

  const response = await request.post(orgPath(admin, '/repositories'), { headers: bearer(admin), data: { connection_id: acme.id, external_ids: ['gh-1004'] } })

  const added: Schemas['RepositoryList'] = await response.json()
  expect({ offered: available.items.map((item) => item.external_id), status: response.status(), added: added.items.map((item) => item.full_name) }).toEqual({
    offered: ['gh-1004', 'gh-1005', 'gh-1006'],
    status: 201,
    added: ['acme/acme-api'],
  })
})

test('removing a repository that backs applications answers 409 naming them', async ({ request }) => {
  const admin = await signIn(request, ADMIN)
  const shop = await repositoryNamed(request, admin, 'acme/shop')

  const response = await request.delete(orgPath(admin, `/repositories/${shop.id}`), { headers: bearer(admin) })

  const body: Schemas['RepositoryInUse'] = await response.json()
  expect({ status: response.status(), code: body.code, applications: body.applications.map((application) => application.name) }).toEqual({
    status: 409,
    code: 'repository_in_use',
    applications: ['shop', 'shop-admin'],
  })
})

test('removing a repository no application backs answers 204 and drops it from the list', async ({ request }) => {
  const admin = await signIn(request, ADMIN)
  const added = await repositoryNamed(request, admin, 'acme/acme-api')

  const response = await request.delete(orgPath(admin, `/repositories/${added.id}`), { headers: bearer(admin) })

  const listed = (await repositoriesOf(request, admin)).some((item) => item.full_name === 'acme/acme-api')
  expect({ status: response.status(), listed }).toEqual({ status: 204, listed: false })
})

test('an OrgMember cannot add repositories', async ({ request }) => {
  const member = await signIn(request, MEMBER)
  const acme = await connectionNamed(request, member, 'acme')

  const response = await request.post(orgPath(member, '/repositories'), { headers: bearer(member), data: { connection_id: acme.id, external_ids: ['gh-1005'] } })

  expect(response.status()).toBe(403)
})

test('connecting an account the provider refuses answers 400 connection_failed', async ({ request }) => {
  const admin = await signIn(request, ADMIN)

  const response = await request.post(orgPath(admin, '/git-connections'), {
    headers: bearer(admin),
    data: { provider: RepoProvider.Github, account_login: 'needs-reauth' },
  })

  expect({ status: response.status(), code: (await response.json()).code }).toEqual({ status: 400, code: 'connection_failed' })
})

test('verifying a connection the provider refuses records error', async ({ request }) => {
  const admin = await signIn(request, ADMIN)
  const refused = await connectionNamed(request, admin, 'needs-reauth')

  const response = await request.post(orgPath(admin, `/git-connections/${refused.id}/verify`), { headers: bearer(admin) })

  const answered: Schemas['GitConnection'] = await response.json()
  expect({ status: response.status(), connection: answered.status }).toEqual({ status: 200, connection: ConnectionStatus.Error })
})
