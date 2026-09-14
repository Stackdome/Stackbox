import { type APIRequestContext, expect, test } from '@playwright/test'
import { StackfileSync, type components } from '@stackbox/contract'
import { bearer, type Session, signIn } from './support'

type Schemas = components['schemas']

const ADMIN = { email: 'ada@example.com', password: 'password' }
const VIEWER = { email: 'vik@example.com', password: 'password' }
const BILLING_SYNCED_SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678'

const orgPath = (session: Session, path: string) => `/api/v1/organizations/${session.user.organisation_id}${path}`

async function applicationsOf(request: APIRequestContext, session: Session): Promise<Schemas['ApplicationListItem'][]> {
  const list: Schemas['ApplicationList'] = await (await request.get(orgPath(session, '/applications'), { headers: bearer(session) })).json()
  return list.items
}

async function applicationNamed(request: APIRequestContext, session: Session, name: string): Promise<Schemas['ApplicationListItem']> {
  return (await applicationsOf(request, session)).filter((item) => item.name === name)[0]
}

async function repositoryNamed(request: APIRequestContext, session: Session, fullName: string): Promise<Schemas['Repository']> {
  const list: Schemas['RepositoryList'] = await (await request.get(orgPath(session, '/repositories'), { headers: bearer(session) })).json()
  return list.items.filter((item) => item.full_name === fullName)[0]
}

test.describe.configure({ mode: 'serial' })

test('creating an application syncs its Stackfile and answers its three services', async ({ request }) => {
  const admin = await signIn(request, ADMIN)
  const designSystem = await repositoryNamed(request, admin, 'acme/design-system')

  const response = await request.post(orgPath(admin, '/applications'), { headers: bearer(admin), data: { name: 'design-system', repository_id: designSystem.id } })

  const created: Schemas['ApplicationDetail'] = await response.json()
  expect({ status: response.status(), sync: created.sync, services: created.services.map((row) => row.name) }).toEqual({
    status: 201,
    sync: StackfileSync.Synced,
    services: ['api', 'postgres', 'web'],
  })
})

test('the seeded billing application reads stale against the provider head', async ({ request }) => {
  const admin = await signIn(request, ADMIN)
  const billing = await applicationNamed(request, admin, 'billing')

  const detail: Schemas['ApplicationDetail'] = await (await request.get(orgPath(admin, `/applications/${billing.id}`), { headers: bearer(admin) })).json()

  expect({ sync: detail.sync, synced: detail.synced_at_sha, moved: detail.head_sha !== detail.synced_at_sha }).toEqual({
    sync: StackfileSync.Stale,
    synced: BILLING_SYNCED_SHA,
    moved: true,
  })
})

test('re-syncing billing makes it synced at the head sha', async ({ request }) => {
  const admin = await signIn(request, ADMIN)
  const billing = await applicationNamed(request, admin, 'billing')

  const response = await request.post(orgPath(admin, `/applications/${billing.id}/sync`), { headers: bearer(admin) })

  const synced: Schemas['ApplicationDetail'] = await response.json()
  expect({ status: response.status(), sync: synced.sync, atHead: synced.synced_at_sha === synced.head_sha }).toEqual({
    status: 200,
    sync: StackfileSync.Synced,
    atHead: true,
  })
})

test('detecting a Stackfile at a missing path answers the error and creates nothing', async ({ request }) => {
  const admin = await signIn(request, ADMIN)
  const shop = await repositoryNamed(request, admin, 'acme/shop')
  const before = (await applicationsOf(request, admin)).length

  const response = await request.post(orgPath(admin, '/applications/detect'), {
    headers: bearer(admin),
    data: { repository_id: shop.id, stackfile_path: 'missing/stackfile.yml' },
  })

  const detection: Schemas['StackfileDetection'] = await response.json()
  expect({ status: response.status(), error: detection.error, services: detection.services, created: (await applicationsOf(request, admin)).length - before }).toEqual({
    status: 200,
    error: 'Stackfile not found at missing/stackfile.yml',
    services: [],
    created: 0,
  })
})

test('deleting an application with a task still running answers 409', async ({ request }) => {
  const admin = await signIn(request, ADMIN)
  const shop = await applicationNamed(request, admin, 'shop')

  const response = await request.delete(orgPath(admin, `/applications/${shop.id}`), { headers: bearer(admin) })

  expect({ status: response.status(), code: (await response.json()).code }).toEqual({ status: 409, code: 'application_has_active_tasks' })
})

test('deleting an application with no task answers 204 and the application is gone', async ({ request }) => {
  const admin = await signIn(request, ADMIN)
  const designSystem = await applicationNamed(request, admin, 'design-system')

  const response = await request.delete(orgPath(admin, `/applications/${designSystem.id}`), { headers: bearer(admin) })

  const detail = await request.get(orgPath(admin, `/applications/${designSystem.id}`), { headers: bearer(admin) })
  expect([response.status(), detail.status()]).toEqual([204, 404])
})

test('a Viewer cannot create an application', async ({ request }) => {
  const viewer = await signIn(request, VIEWER)
  const designSystem = await repositoryNamed(request, viewer, 'acme/design-system')

  const response = await request.post(orgPath(viewer, '/applications'), { headers: bearer(viewer), data: { name: 'viewer-app', repository_id: designSystem.id } })

  expect(response.status()).toBe(403)
})
