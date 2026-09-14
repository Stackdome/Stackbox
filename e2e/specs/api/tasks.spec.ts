import { type APIRequestContext, expect, test } from '@playwright/test'
import { CoarseStatus, TaskEventKind, TaskKind, TaskPhase, TaskResolution, type components } from '@stackbox/contract'

type Schemas = components['schemas']
type Session = { token: string; user: { organisation_id: string } }

const ADMIN = { email: 'ada@example.com', password: 'password' }
const VIEWER = { email: 'vik@example.com', password: 'password' }
const BUDGET_TASK = 'Nightly invoice run exceeds its budget'

const bearer = (session: Session) => ({ Authorization: `Bearer ${session.token}` })
const orgPath = (session: Session, path: string) => `/api/v1/organizations/${session.user.organisation_id}${path}`

async function signIn(request: APIRequestContext, credentials: typeof ADMIN): Promise<Session> {
  const response = await request.post('/api/v1/auth/login', { data: credentials })
  expect(response.status()).toBe(200)
  return response.json()
}

async function applicationNamed(request: APIRequestContext, session: Session, name: string): Promise<string> {
  const list: Schemas['ApplicationList'] = await (await request.get(orgPath(session, '/applications'), { headers: bearer(session) })).json()
  return list.items.filter((item) => item.name === name)[0].id
}

async function tasksWhere(request: APIRequestContext, session: Session, query: string): Promise<Schemas['TaskSummary'][]> {
  const list: Schemas['TaskList'] = await (await request.get(orgPath(session, `/tasks${query}`), { headers: bearer(session) })).json()
  return list.items
}

async function detailOf(request: APIRequestContext, session: Session, taskId: string): Promise<Schemas['TaskDetail']> {
  return (await request.get(orgPath(session, `/tasks/${taskId}`), { headers: bearer(session) })).json()
}

async function createShopTask(request: APIRequestContext, session: Session, data: Record<string, unknown>) {
  const applicationId = await applicationNamed(request, session, 'shop')
  return request.post(orgPath(session, '/tasks'), { headers: bearer(session), data: { application_id: applicationId, ...data } })
}

test.describe.configure({ mode: 'serial' })

test('an admin creates a task that answers 201 in intake and appears in the list', async ({ request }) => {
  const admin = await signIn(request, ADMIN)

  const response = await createShopTask(request, admin, { description: 'The cart badge shows zero after a refresh.' })

  const created: Schemas['TaskDetail'] = await response.json()
  const listed = (await tasksWhere(request, admin, '')).some((item) => item.id === created.id)
  expect({ status: response.status(), phase: created.phase, listed }).toEqual({ status: 201, phase: TaskPhase.Intake, listed: true })
})

test('the reconciler walks a created task to hand_over with the scripted agent within 30 seconds', async ({ request }) => {
  const admin = await signIn(request, ADMIN)
  const created: Schemas['TaskDetail'] = await (await createShopTask(request, admin, { description: 'Wishlist heart does not stay filled.' })).json()

  await expect
    .poll(async () => (await detailOf(request, admin, created.id)).phase, { timeout: 30_000, intervals: [1_000] })
    .toBe(TaskPhase.HandOver)
})

test('creating a task of kind onboarding answers 400 naming the unsupported kind', async ({ request }) => {
  const admin = await signIn(request, ADMIN)

  const response = await createShopTask(request, admin, { description: 'Set up the shop.', kind: TaskKind.Onboarding })

  expect({ status: response.status(), body: await response.json() }).toEqual({
    status: 400,
    body: { code: 'unsupported_task_kind', message: 'Tasks of kind onboarding are not supported yet' },
  })
})

test("a Viewer's create on the application it can only read is forbidden", async ({ request }) => {
  const viewer = await signIn(request, VIEWER)

  const response = await createShopTask(request, viewer, { description: 'The cart badge shows zero.' })

  expect(response.status()).toBe(403)
})

test('creating a task on an application id that is not a uuid answers 404', async ({ request }) => {
  const admin = await signIn(request, ADMIN)

  const response = await request.post(orgPath(admin, '/tasks'), { headers: bearer(admin), data: { application_id: 'shop', description: 'Anything.' } })

  expect(response.status()).toBe(404)
})

test('replying to a task that needs input moves it back to the phase it diverted from', async ({ request }) => {
  const admin = await signIn(request, ADMIN)
  const [waiting] = (await tasksWhere(request, admin, `?status=${CoarseStatus.NeedsYou}`)).filter((item) => item.application.name === 'shop')

  const response = await request.post(orgPath(admin, `/tasks/${waiting.id}/messages`), {
    headers: bearer(admin),
    data: { body: 'Safari 17.4 on macOS 14.' },
  })

  const detail = await detailOf(request, admin, waiting.id)
  expect({ status: response.status(), phase: detail.phase, question: detail.blocking_question }).toEqual({
    status: 200,
    phase: TaskPhase.Implementing,
    question: null,
  })
})

test('a reply with only spaces answers 400', async ({ request }) => {
  const admin = await signIn(request, ADMIN)
  const [any] = await tasksWhere(request, admin, '')

  const response = await request.post(orgPath(admin, `/tasks/${any.id}/messages`), { headers: bearer(admin), data: { body: '   ' } })

  expect(response.status()).toBe(400)
})

test('the reconciler abandons the seeded task whose one cent budget is already spent', async ({ request }) => {
  const admin = await signIn(request, ADMIN)
  const [budgeted] = await tasksWhere(request, admin, `?q=${encodeURIComponent(BUDGET_TASK)}`)

  await expect
    .poll(async () => (await detailOf(request, admin, budgeted.id)).phase, { timeout: 30_000, intervals: [1_000] })
    .toBe(TaskPhase.Failed)

  const detail = await detailOf(request, admin, budgeted.id)
  const events: Schemas['TaskEventList'] = await (await request.get(orgPath(admin, `/tasks/${budgeted.id}/events`), { headers: bearer(admin) })).json()
  expect({ resolution: detail.resolution, budgetExceeded: events.items.some((event) => event.kind === TaskEventKind.BudgetExceeded) }).toEqual({
    resolution: TaskResolution.Abandoned,
    budgetExceeded: true,
  })
})
