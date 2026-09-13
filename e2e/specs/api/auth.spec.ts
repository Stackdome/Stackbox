import { type APIRequestContext, expect, test } from '@playwright/test'

const ADMIN = { email: 'ada@example.com', password: 'password' }
const VIEWER = { email: 'vik@example.com', password: 'password' }
const DEVELOPER = { email: 'dev@example.com', password: 'password' }

type Session = { token: string; refresh_token: string; user: { email: string; organisation_id: string } }
type TaskList = { items: { id: string; application: { name: string } }[] }

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })

async function signIn(request: APIRequestContext, credentials: typeof ADMIN): Promise<Session> {
  const response = await request.post('/api/v1/auth/login', { data: credentials })
  expect(response.status()).toBe(200)
  return response.json()
}

async function aTaskFor(request: APIRequestContext, session: Session, applicationName: string, query = ''): Promise<string> {
  const response = await request.get(`/api/v1/organizations/${session.user.organisation_id}/tasks${query}`, {
    headers: bearer(session.token),
  })
  const list: TaskList = await response.json()
  return list.items.filter((item) => item.application.name === applicationName)[0].id
}

async function aRunningShopTask(request: APIRequestContext, session: Session): Promise<string> {
  return aTaskFor(request, session, 'shop', '?status=running')
}

async function aRunningBillingTask(request: APIRequestContext, session: Session): Promise<string> {
  return aTaskFor(request, session, 'billing', '?status=running')
}

async function aShopTask(request: APIRequestContext, session: Session): Promise<string> {
  return aTaskFor(request, session, 'shop')
}

test.describe.configure({ mode: 'serial' })

test('signing in as the seeded admin answers an access token', async ({ request }) => {
  const session = await signIn(request, ADMIN)

  expect(session.token.split('.')).toHaveLength(3)
})

test('signing in sets an httpOnly auth_token cookie', async ({ request }) => {
  const response = await request.post('/api/v1/auth/login', { data: ADMIN })

  expect(response.headers()['set-cookie']).toMatch(/auth_token=[^;]+;.*HttpOnly/)
})

test('the current user answers the admin when called with the Bearer token', async ({ request }) => {
  const session = await signIn(request, ADMIN)

  const response = await request.get('/api/v1/users/current', { headers: bearer(session.token) })

  expect((await response.json()).email).toBe(ADMIN.email)
})

test('the current user refuses a request without a token', async ({ playwright, baseURL }) => {
  const anonymous = await playwright.request.newContext({ baseURL })

  const response = await anonymous.get('/api/v1/users/current')

  expect(response.status()).toBe(401)
  await anonymous.dispose()
})

test('refreshing exchanges the refresh token for a new pair', async ({ request }) => {
  const session = await signIn(request, ADMIN)

  const response = await request.post('/api/v1/auth/refresh', { data: { refreshToken: session.refresh_token } })

  expect((await response.json()).refreshToken).not.toBe(session.refresh_token)
})

test("a Viewer's cancel on a running task is forbidden", async ({ request }) => {
  const admin = await signIn(request, ADMIN)
  const taskId = await aRunningShopTask(request, admin)
  const viewer = await signIn(request, VIEWER)

  const response = await request.post(`/api/v1/organizations/${viewer.user.organisation_id}/tasks/${taskId}/cancel`, {
    headers: bearer(viewer.token),
  })

  expect(response.status()).toBe(403)
})

test("a Developer's cancel on a running shop task succeeds", async ({ request }) => {
  const admin = await signIn(request, ADMIN)
  const taskId = await aRunningShopTask(request, admin)
  const developer = await signIn(request, DEVELOPER)

  const response = await request.post(`/api/v1/organizations/${developer.user.organisation_id}/tasks/${taskId}/cancel`, {
    headers: bearer(developer.token),
  })

  expect(response.status()).toBe(200)
})

test("a Developer's cancel on a running billing task is forbidden", async ({ request }) => {
  const admin = await signIn(request, ADMIN)
  const taskId = await aRunningBillingTask(request, admin)
  const developer = await signIn(request, DEVELOPER)

  const response = await request.post(`/api/v1/organizations/${developer.user.organisation_id}/tasks/${taskId}/cancel`, {
    headers: bearer(developer.token),
  })

  expect(response.status()).toBe(403)
})

test("the admin's GET on another organization's id with a shop task id is forbidden", async ({ request }) => {
  const admin = await signIn(request, ADMIN)
  const taskId = await aShopTask(request, admin)
  const otherOrgId = '00000000-0000-4000-8000-000000000000'

  const response = await request.get(`/api/v1/organizations/${otherOrgId}/tasks/${taskId}`, {
    headers: bearer(admin.token),
  })

  expect(response.status()).toBe(403)
})

test("an admin's cancel succeeds once and conflicts when repeated", async ({ request }) => {
  const admin = await signIn(request, ADMIN)
  const taskId = await aRunningBillingTask(request, admin)
  const cancel = () =>
    request.post(`/api/v1/organizations/${admin.user.organisation_id}/tasks/${taskId}/cancel`, { headers: bearer(admin.token) })

  const statuses = [(await cancel()).status(), (await cancel()).status()]

  expect(statuses).toEqual([200, 409])
})
