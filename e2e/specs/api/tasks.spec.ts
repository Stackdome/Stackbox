import { expect, test } from '@playwright/test'
import { CoarseStatus, TaskEventKind, TaskKind, TaskPhase, TaskResolution, type components } from '@stackbox/contract'
import { orgPath, type Session, signIn } from './support'

type Schemas = components['schemas']

const ADMIN = { email: 'ada@example.com', password: 'password' }
const VIEWER = { email: 'vik@example.com', password: 'password' }
const BUDGET_TASK = 'Nightly invoice run exceeds its budget'

async function applicationNamed(session: Session, name: string): Promise<string> {
  const list: Schemas['ApplicationList'] = await (await session.api.get(orgPath(session, '/applications'))).json()
  return list.items.filter((item) => item.name === name)[0].id
}

async function tasksWhere(session: Session, query: string): Promise<Schemas['TaskSummary'][]> {
  const list: Schemas['TaskList'] = await (await session.api.get(orgPath(session, `/tasks${query}`))).json()
  return list.items
}

async function detailOf(session: Session, taskId: string): Promise<Schemas['TaskDetail']> {
  return (await session.api.get(orgPath(session, `/tasks/${taskId}`))).json()
}

async function createShopTask(session: Session, data: Record<string, unknown>) {
  const applicationId = await applicationNamed(session, 'shop')
  return session.api.post(orgPath(session, '/tasks'), { data: { application_id: applicationId, ...data } })
}

test.describe.configure({ mode: 'serial' })

test('an admin creates a task that answers 201 in intake and appears in the list', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)

  const response = await createShopTask(admin, { description: 'The cart badge shows zero after a refresh.' })

  const created: Schemas['TaskDetail'] = await response.json()
  const listed = (await tasksWhere(admin, '')).some((item) => item.id === created.id)
  expect({ status: response.status(), phase: created.phase, listed }).toEqual({ status: 201, phase: TaskPhase.Intake, listed: true })
})

test('the reconciler walks a created task to hand_over with the scripted agent within 30 seconds', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const created: Schemas['TaskDetail'] = await (await createShopTask(admin, { description: 'Wishlist heart does not stay filled.' })).json()

  await expect
    .poll(async () => (await detailOf(admin, created.id)).phase, { timeout: 30_000, intervals: [1_000] })
    .toBe(TaskPhase.HandOver)
})

test('creating a task of kind onboarding answers 400 naming the unsupported kind', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)

  const response = await createShopTask(admin, { description: 'Set up the shop.', kind: TaskKind.Onboarding })

  expect({ status: response.status(), body: await response.json() }).toEqual({
    status: 400,
    body: { code: 'unsupported_task_kind', message: 'Tasks of kind onboarding are not supported yet' },
  })
})

test("a Viewer's create on the application it can only read is forbidden", async ({ playwright, baseURL }) => {
  const viewer = await signIn(playwright, baseURL, VIEWER)

  const response = await createShopTask(viewer, { description: 'The cart badge shows zero.' })

  expect(response.status()).toBe(403)
})

test('creating a task on an application id that is not a uuid answers 404', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)

  const response = await admin.api.post(orgPath(admin, '/tasks'), { data: { application_id: 'shop', description: 'Anything.' } })

  expect(response.status()).toBe(404)
})

test('replying to a task that needs input moves it back to the phase it diverted from', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const [waiting] = (await tasksWhere(admin, `?status=${CoarseStatus.NeedsYou}`)).filter((item) => item.application.name === 'shop')

  const response = await admin.api.post(orgPath(admin, `/tasks/${waiting.id}/messages`), {
    data: { body: 'Safari 17.4 on macOS 14.' },
  })

  const detail = await detailOf(admin, waiting.id)
  expect({ status: response.status(), phase: detail.phase, question: detail.blocking_question }).toEqual({
    status: 200,
    phase: TaskPhase.Implementing,
    question: null,
  })
})

test('a reply with only spaces answers 400', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const [any] = await tasksWhere(admin, '')

  const response = await admin.api.post(orgPath(admin, `/tasks/${any.id}/messages`), { data: { body: '   ' } })

  expect(response.status()).toBe(400)
})

test('the reconciler abandons the seeded task whose one cent budget is already spent', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const [budgeted] = await tasksWhere(admin, `?q=${encodeURIComponent(BUDGET_TASK)}`)

  await expect
    .poll(async () => (await detailOf(admin, budgeted.id)).phase, { timeout: 30_000, intervals: [1_000] })
    .toBe(TaskPhase.Failed)

  const detail = await detailOf(admin, budgeted.id)
  const events: Schemas['TaskEventList'] = await (await admin.api.get(orgPath(admin, `/tasks/${budgeted.id}/events`))).json()
  expect({ resolution: detail.resolution, budgetExceeded: events.items.some((event) => event.kind === TaskEventKind.BudgetExceeded) }).toEqual({
    resolution: TaskResolution.Abandoned,
    budgetExceeded: true,
  })
})
