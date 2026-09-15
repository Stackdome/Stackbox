import { expect, test } from '@playwright/test'
import { StackfileSync, type components } from '@stackbox/contract'
import { orgPath, type Session, signIn } from './support'

type Schemas = components['schemas']

const ADMIN = { email: 'ada@example.com', password: 'password' }
const VIEWER = { email: 'vik@example.com', password: 'password' }
const BILLING_SYNCED_SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678'

async function applicationsOf(session: Session): Promise<Schemas['ApplicationListItem'][]> {
  const list: Schemas['ApplicationList'] = await (await session.api.get(orgPath(session, '/applications'))).json()
  return list.items
}

async function applicationNamed(session: Session, name: string): Promise<Schemas['ApplicationListItem']> {
  return (await applicationsOf(session)).filter((item) => item.name === name)[0]
}

async function repositoryNamed(session: Session, fullName: string): Promise<Schemas['Repository']> {
  const list: Schemas['RepositoryList'] = await (await session.api.get(orgPath(session, '/repositories'))).json()
  return list.items.filter((item) => item.full_name === fullName)[0]
}

test.describe.configure({ mode: 'serial' })

test('creating an application syncs its Stackfile and answers its three services', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const designSystem = await repositoryNamed(admin, 'acme/design-system')

  const response = await admin.api.post(orgPath(admin, '/applications'), { data: { name: 'design-system', repository_id: designSystem.id } })

  const created: Schemas['ApplicationDetail'] = await response.json()
  expect({ status: response.status(), sync: created.sync, services: created.services.map((row) => row.name) }).toEqual({
    status: 201,
    sync: StackfileSync.Synced,
    services: ['api', 'postgres', 'web'],
  })
})

test('the seeded billing application reads stale against the provider head', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const billing = await applicationNamed(admin, 'billing')

  const detail: Schemas['ApplicationDetail'] = await (await admin.api.get(orgPath(admin, `/applications/${billing.id}`))).json()

  expect({ sync: detail.sync, synced: detail.synced_at_sha, moved: detail.head_sha !== detail.synced_at_sha }).toEqual({
    sync: StackfileSync.Stale,
    synced: BILLING_SYNCED_SHA,
    moved: true,
  })
})

test('re-syncing billing makes it synced at the head sha', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const billing = await applicationNamed(admin, 'billing')

  const response = await admin.api.post(orgPath(admin, `/applications/${billing.id}/sync`))

  const synced: Schemas['ApplicationDetail'] = await response.json()
  expect({ status: response.status(), sync: synced.sync, atHead: synced.synced_at_sha === synced.head_sha }).toEqual({
    status: 200,
    sync: StackfileSync.Synced,
    atHead: true,
  })
})

test('detecting a Stackfile at a missing path answers the error and creates nothing', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const shop = await repositoryNamed(admin, 'acme/shop')
  const before = (await applicationsOf(admin)).length

  const response = await admin.api.post(orgPath(admin, '/applications/detect'), {
    data: { repository_id: shop.id, stackfile_path: 'missing/stackfile.yml' },
  })

  const detection: Schemas['StackfileDetection'] = await response.json()
  expect({ status: response.status(), error: detection.error, services: detection.services, created: (await applicationsOf(admin)).length - before }).toEqual({
    status: 200,
    error: 'Stackfile not found at missing/stackfile.yml',
    services: [],
    created: 0,
  })
})

test('deleting an application with a task still running answers 409', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const shop = await applicationNamed(admin, 'shop')

  const response = await admin.api.delete(orgPath(admin, `/applications/${shop.id}`))

  expect({ status: response.status(), code: (await response.json()).code }).toEqual({ status: 409, code: 'application_has_active_tasks' })
})

test('deleting an application with no task answers 204 and the application is gone', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const designSystem = await applicationNamed(admin, 'design-system')

  const response = await admin.api.delete(orgPath(admin, `/applications/${designSystem.id}`))

  const detail = await admin.api.get(orgPath(admin, `/applications/${designSystem.id}`))
  expect([response.status(), detail.status()]).toEqual([204, 404])
})

test('a Viewer cannot create an application', async ({ playwright, baseURL }) => {
  const viewer = await signIn(playwright, baseURL, VIEWER)
  const designSystem = await repositoryNamed(viewer, 'acme/design-system')

  const response = await viewer.api.post(orgPath(viewer, '/applications'), { data: { name: 'viewer-app', repository_id: designSystem.id } })

  expect(response.status()).toBe(403)
})
