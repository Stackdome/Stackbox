import { type APIRequestContext, expect } from '@playwright/test'

export type Session = { token: string; refresh_token: string; user: { email: string; organisation_id: string } }

export const bearer = (session: Session) => ({ Authorization: `Bearer ${session.token}` })

export async function signIn(request: APIRequestContext, credentials: { email: string; password: string }): Promise<Session> {
  const response = await request.post('/api/v1/auth/login', { data: credentials })
  expect(response.status()).toBe(200)
  return response.json()
}
