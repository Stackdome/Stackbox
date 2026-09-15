import { expect, test } from '@playwright/test'
import { UserRole, type components } from '@stackbox/contract'
import { type Twin, arrangeTwin, removeTwin } from './database'
import { type Session, orgPath, setCookies, signIn } from './support'

type Schemas = components['schemas']

const ADMIN = { email: 'ada@example.com', password: 'password' }
const VIEWER = { email: 'vik@example.com', password: 'password' }
const DEVELOPER = { email: 'dev@example.com', password: 'password' }
const TWIN_EMAIL = 'twin@example.com'
const LOCKED_OUT_EMAIL = 'locked-out@example.com'
const MAX_FAILED_ATTEMPTS = 5
const OTHER_ORGANIZATION_ID = '00000000-0000-4000-8000-000000000000'
const INVALID_CREDENTIALS = { code: 'invalid_credentials', message: 'The email or password is not right' }

async function aTaskFor(session: Session, applicationName: string, query = ''): Promise<string> {
  const list: Schemas['TaskList'] = await (await session.api.get(orgPath(session, `/tasks${query}`))).json()
  return list.items.filter((item) => item.application.name === applicationName)[0].id
}

function cookieNamed(cookies: string[], name: string): string[] {
  return cookies.find((cookie) => cookie.startsWith(`${name}=`))?.split('; ') ?? []
}

test.describe.configure({ mode: 'serial' })

let twin: Twin

test.beforeAll(async () => {
  twin = await arrangeTwin(TWIN_EMAIL)
})

test.afterAll(async () => {
  await removeTwin(twin)
})

test('rejects a login with the wrong password without revealing whether the email exists', async ({ request }) => {
  const wrongPassword = await request.post('/api/v1/auth/login', { data: { email: ADMIN.email, password: 'not the password' } })
  const unknownEmail = await request.post('/api/v1/auth/login', { data: { email: 'nobody@example.com', password: 'not the password' } })

  expect([wrongPassword.status(), await wrongPassword.json(), unknownEmail.status(), await unknownEmail.json()]).toEqual([
    401,
    INVALID_CREDENTIALS,
    401,
    INVALID_CREDENTIALS,
  ])
})

test('sets an httpOnly cookie on a successful login and no token in the response body', async ({ request }) => {
  const response = await request.post('/api/v1/auth/login', { data: ADMIN })

  const access = cookieNamed(setCookies(response), 'auth_token')
  const token = access[0]?.slice('auth_token='.length) ?? ''
  const body = await response.text()
  expect({ status: response.status(), httpOnly: access.includes('HttpOnly'), tokenInBody: token !== '' && body.includes(token), keys: Object.keys(JSON.parse(body)) }).toEqual({
    status: 200,
    httpOnly: true,
    tokenInBody: false,
    keys: ['user'],
  })
})

test('the refresh cookie travels only to the refresh route, httpOnly and strict same site', async ({ request }) => {
  const response = await request.post('/api/v1/auth/login', { data: ADMIN })

  const refresh = cookieNamed(setCookies(response), 'refresh_token')
  expect(['Path=/api/v1/auth/refresh', 'HttpOnly', 'SameSite=Strict'].every((part) => refresh.includes(part))).toBe(true)
})

test('the current user answers through the session cookie alone', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)

  const current: Schemas['CurrentUser'] = await (await admin.api.get('/api/v1/users/current')).json()

  expect([current.email, current.role, current.organization.id]).toEqual([ADMIN.email, admin.user.role, admin.user.organization.id])
})

test('the current user refuses a request without a session', async ({ request }) => {
  expect((await request.get('/api/v1/users/current')).status()).toBe(401)
})

test('refreshing through the refresh cookie answers the user and a new access cookie', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)

  const response = await admin.api.post('/api/v1/auth/refresh')

  expect([response.status(), (await response.json()).user.email, cookieNamed(setCookies(response), 'auth_token').length > 0]).toEqual([200, ADMIN.email, true])
})

test('signing out revokes the refresh cookie on every device', async ({ playwright, baseURL }) => {
  const twinInAcme = await signIn(playwright, baseURL, { email: twin.email, password: ADMIN.password, organization_id: twin.acmeId })
  const saved = await twinInAcme.api.storageState()

  const signedOut = await twinInAcme.api.post('/api/v1/auth/logout')
  const otherDevice = await playwright.request.newContext({ baseURL, storageState: saved })
  const refreshed = await otherDevice.post('/api/v1/auth/refresh')

  expect([signedOut.status(), refreshed.status(), (await refreshed.json()).code]).toEqual([204, 401, 'invalid_refresh'])
  await otherDevice.dispose()
})

test('an email and password that match accounts in two organizations answer 409 naming both', async ({ request }) => {
  const response = await request.post('/api/v1/auth/login', { data: { email: twin.email, password: ADMIN.password } })

  const body = await response.json()
  expect([response.status(), body.code, body.details.organizations.map((organization: { id: string }) => organization.id).sort()]).toEqual([
    409,
    'choose_organization',
    [twin.acmeId, twin.globexId].sort(),
  ])
})

test('naming the organization signs the twin in to that one', async ({ playwright, baseURL }) => {
  const inGlobex = await signIn(playwright, baseURL, { email: twin.email, password: ADMIN.password, organization_id: twin.globexId })

  expect([inGlobex.user.organization.id, inGlobex.user.role]).toEqual([twin.globexId, UserRole.OrgAdmin])
})

test('the sixth sign in for an email after five failures answers 429 with the seconds to wait', async ({ request }) => {
  for (let attempt = 0; attempt < MAX_FAILED_ATTEMPTS; attempt++) {
    await request.post('/api/v1/auth/login', { data: { email: LOCKED_OUT_EMAIL, password: 'not the password' } })
  }

  const refused = await request.post('/api/v1/auth/login', { data: { email: LOCKED_OUT_EMAIL, password: 'not the password' } })

  const body = await refused.json()
  expect([refused.status(), body.code, body.details.retry_after_seconds > 0]).toEqual([429, 'too_many_attempts', true])
})

test("a Viewer's cancel on a running task is forbidden", async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const taskId = await aTaskFor(admin, 'shop', '?status=running')
  const viewer = await signIn(playwright, baseURL, VIEWER)

  const response = await viewer.api.post(orgPath(viewer, `/tasks/${taskId}/cancel`))

  expect(response.status()).toBe(403)
})

test("a Developer's cancel on a running shop task succeeds", async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const taskId = await aTaskFor(admin, 'shop', '?status=running')
  const developer = await signIn(playwright, baseURL, DEVELOPER)

  const response = await developer.api.post(orgPath(developer, `/tasks/${taskId}/cancel`))

  expect(response.status()).toBe(200)
})

test("a Developer's cancel on a running billing task is forbidden", async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const taskId = await aTaskFor(admin, 'billing', '?status=running')
  const developer = await signIn(playwright, baseURL, DEVELOPER)

  const response = await developer.api.post(orgPath(developer, `/tasks/${taskId}/cancel`))

  expect(response.status()).toBe(403)
})

test("the admin's GET on another organization's id with a shop task id is forbidden", async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const taskId = await aTaskFor(admin, 'shop')

  const response = await admin.api.get(`/api/v1/organizations/${OTHER_ORGANIZATION_ID}/tasks/${taskId}`)

  expect(response.status()).toBe(403)
})

test("an admin's cancel succeeds once and conflicts when repeated", async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const taskId = await aTaskFor(admin, 'billing', '?status=running')
  const cancel = () => admin.api.post(orgPath(admin, `/tasks/${taskId}/cancel`))

  const statuses = [(await cancel()).status(), (await cancel()).status()]

  expect(statuses).toEqual([200, 409])
})

test('a Bearer value that is not an api token answers 401, even a session token', async ({ playwright, baseURL, request }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const session = (await admin.api.storageState()).cookies.find((cookie) => cookie.name === 'auth_token')?.value ?? ''

  const response = await request.get('/api/v1/users/current', { headers: { Authorization: `Bearer ${session}` } })

  expect(response.status()).toBe(401)
})
