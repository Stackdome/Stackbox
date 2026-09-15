import { expect, test } from '@playwright/test'
import { InstanceExpiryHours, InstancePurpose, InstanceStatus, ReleaseStatus, type components } from '@stackbox/contract'
import { orgPath, type Session, signIn } from './support'

type Schemas = components['schemas']

const ADMIN = { email: 'ada@example.com', password: 'password' }
const MEMBER = { email: 'vik@example.com', password: 'password' }
const WALK_TIMEOUT_MS = 15_000
const WEEK_MS = 168 * 3_600_000
const EXPIRY_TOLERANCE_MS = 60_000
const UNKNOWN_APPLICATION_ID = '00000000-0000-4000-8000-00000000dead'

async function applicationNamed(session: Session, name: string): Promise<Schemas['ApplicationListItem']> {
  const list: Schemas['ApplicationList'] = await (await session.api.get(orgPath(session, '/applications'))).json()
  return list.items.filter((item) => item.name === name)[0]
}

async function repositoryNamed(session: Session, fullName: string): Promise<Schemas['Repository']> {
  const list: Schemas['RepositoryList'] = await (await session.api.get(orgPath(session, '/repositories'))).json()
  return list.items.filter((item) => item.full_name === fullName)[0]
}

function spinUp(session: Session, body: { application_id: string; purpose?: InstancePurpose }) {
  return session.api.post(orgPath(session, '/instances'), { data: { purpose: InstancePurpose.Scratch, ...body } })
}

async function detailOf(session: Session, instanceId: string): Promise<Schemas['InstanceDetail']> {
  return (await session.api.get(orgPath(session, `/instances/${instanceId}`))).json()
}

async function aReadyScratchOnBilling(session: Session): Promise<Schemas['InstanceDetail']> {
  const billing = await applicationNamed(session, 'billing')
  const created: Schemas['InstanceDetail'] = await (await spinUp(session, { application_id: billing.id })).json()
  await expect.poll(async () => (await detailOf(session, created.id)).status, { timeout: WALK_TIMEOUT_MS }).toBe(InstanceStatus.Ready)
  return created
}

test.describe.configure({ mode: 'serial' })

test('the list leaves torn down instances out unless asked, and the persistent instance has no expiry', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)

  const hidden: Schemas['InstanceList'] = await (await admin.api.get(orgPath(admin, '/instances'))).json()
  const shown: Schemas['InstanceList'] = await (await admin.api.get(orgPath(admin, '/instances?include_torn_down=true'))).json()

  expect([
    hidden.items.some((item) => item.status === InstanceStatus.TornDown),
    shown.items.some((item) => item.status === InstanceStatus.TornDown),
    hidden.items.filter((item) => item.purpose === InstancePurpose.Persistent).map((item) => item.expires_at),
  ]).toEqual([false, true, [null]])
})

test('spinning up a scratch instance answers provisioning, then ready once its first release is live', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const billing = await applicationNamed(admin, 'billing')

  const response = await spinUp(admin, { application_id: billing.id })

  const created: Schemas['InstanceDetail'] = await response.json()
  expect([response.status(), created.status, created.releases.map((release) => release.status)]).toEqual([201, InstanceStatus.Provisioning, [ReleaseStatus.Queued]])
  await expect.poll(async () => (await detailOf(admin, created.id)).status, { timeout: WALK_TIMEOUT_MS }).toBe(InstanceStatus.Ready)
})

test('spinning up with the task purpose answers 400 purpose_reserved', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const billing = await applicationNamed(admin, 'billing')

  const response = await spinUp(admin, { application_id: billing.id, purpose: InstancePurpose.Task })

  expect([response.status(), (await response.json()).code]).toEqual([400, 'purpose_reserved'])
})

test('spinning up an application that never synced answers 409 application_not_synced', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const shopAdmin = await applicationNamed(admin, 'shop-admin')

  const response = await spinUp(admin, { application_id: shopAdmin.id })

  expect([response.status(), (await response.json()).code]).toEqual([409, 'application_not_synced'])
})

test('spinning up an application outside the organization answers 404 unknown_application', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)

  const response = await spinUp(admin, { application_id: UNKNOWN_APPLICATION_ID })

  expect([response.status(), (await response.json()).code]).toEqual([404, 'unknown_application'])
})

test('tearing down answers torn down, and answers it again on a second call', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const billing = await applicationNamed(admin, 'billing')
  const created: Schemas['InstanceDetail'] = await (await spinUp(admin, { application_id: billing.id })).json()

  const first = await admin.api.post(orgPath(admin, `/instances/${created.id}/teardown`))
  const second = await admin.api.post(orgPath(admin, `/instances/${created.id}/teardown`))

  expect([first.status(), (await first.json()).status, second.status(), (await second.json()).status]).toEqual([
    200,
    InstanceStatus.TornDown,
    200,
    InstanceStatus.TornDown,
  ])
})

test('extending the expiry answers the new expiry, and 409 for the persistent instance', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const billing = await applicationNamed(admin, 'billing')
  const created: Schemas['InstanceDetail'] = await (await spinUp(admin, { application_id: billing.id })).json()
  const list: Schemas['InstanceList'] = await (await admin.api.get(orgPath(admin, '/instances'))).json()
  const persistent = list.items.filter((item) => item.purpose === InstancePurpose.Persistent)[0]

  const extended = await admin.api.post(orgPath(admin, `/instances/${created.id}/expiry`), { data: { hours: InstanceExpiryHours.Week } })
  const refused = await admin.api.post(orgPath(admin, `/instances/${persistent.id}/expiry`), { data: { hours: InstanceExpiryHours.Week } })

  const detail: Schemas['InstanceDetail'] = await extended.json()
  expect([extended.status(), Math.abs(Date.parse(detail.expires_at ?? '') - (Date.now() + WEEK_MS)) < EXPIRY_TOLERANCE_MS, refused.status(), (await refused.json()).code]).toEqual([
    200,
    true,
    409,
    'instance_has_no_expiry',
  ])
})

test('creating a release answers 201 queued, then 409 while that release is in flight', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const ready = await aReadyScratchOnBilling(admin)

  const created = await admin.api.post(orgPath(admin, `/instances/${ready.id}/releases`), { data: {} })
  const refused = await admin.api.post(orgPath(admin, `/instances/${ready.id}/releases`), { data: {} })

  expect([created.status(), (await created.json()).status, refused.status(), (await refused.json()).code]).toEqual([
    201,
    ReleaseStatus.Queued,
    409,
    'release_in_flight',
  ])
})

test('deleting an application with a live instance answers 409, then 204 once the instance is torn down', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const designSystem = await repositoryNamed(admin, 'acme/design-system')
  const probe: Schemas['ApplicationDetail'] = await (
    await admin.api.post(orgPath(admin, '/applications'), { data: { name: 'instances-probe', repository_id: designSystem.id } })
  ).json()
  const instance: Schemas['InstanceDetail'] = await (await spinUp(admin, { application_id: probe.id })).json()

  const refused = await admin.api.delete(orgPath(admin, `/applications/${probe.id}`))
  await admin.api.post(orgPath(admin, `/instances/${instance.id}/teardown`))
  const removed = await admin.api.delete(orgPath(admin, `/applications/${probe.id}`))

  expect([refused.status(), (await refused.json()).code, removed.status()]).toEqual([409, 'application_has_live_instances', 204])
})

test('an OrgMember cannot spin up an instance', async ({ playwright, baseURL }) => {
  const member = await signIn(playwright, baseURL, MEMBER)
  const billing = await applicationNamed(member, 'billing')

  const response = await spinUp(member, { application_id: billing.id })

  expect(response.status()).toBe(403)
})
