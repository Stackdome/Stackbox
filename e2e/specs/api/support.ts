import { type APIRequestContext, type APIResponse, type PlaywrightWorkerArgs, expect } from '@playwright/test'
import type { components } from '@stackbox/contract'

type Schemas = components['schemas']

export type Credentials = { email: string; password: string; organization_id?: string }

export type Session = { api: APIRequestContext; user: Schemas['CurrentUser'] }

// Each session gets its own request context, so its cookie jar carries that account alone.
export async function signIn(playwright: PlaywrightWorkerArgs['playwright'], baseURL: string | undefined, credentials: Credentials): Promise<Session> {
  const api = await playwright.request.newContext({ baseURL })
  const response = await api.post('/api/v1/auth/login', { data: credentials })
  expect(response.status()).toBe(200)
  const session: Schemas['Session'] = await response.json()
  return { api, user: session.user }
}

export const orgPath = (session: Session, path: string) => `/api/v1/organizations/${session.user.organization.id}${path}`

export function setCookies(response: APIResponse): string[] {
  return response
    .headersArray()
    .filter((header) => header.name.toLowerCase() === 'set-cookie')
    .map((header) => header.value)
}
