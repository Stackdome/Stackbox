import type { IncomingHttpHeaders } from 'node:http'
import { AUTH_COOKIE, cookieFrom } from './cookies'

export const CredentialKind = { ApiToken: 'api_token', Session: 'session' } as const

export type Credential = { kind: typeof CredentialKind.ApiToken; secret: string } | { kind: typeof CredentialKind.Session; token: string }

// A Bearer value is only ever an API token; a session travels in the cookie.
export function credentialFromHeaders(headers: IncomingHttpHeaders): Credential | null {
  const bearer = headers.authorization?.match(/^Bearer (.+)$/)?.[1]
  if (bearer) return { kind: CredentialKind.ApiToken, secret: bearer }
  const token = cookieFrom(headers, AUTH_COOKIE)
  return token ? { kind: CredentialKind.Session, token } : null
}
