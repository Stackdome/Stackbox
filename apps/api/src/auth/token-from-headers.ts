import type { IncomingHttpHeaders } from 'node:http'

export const AUTH_COOKIE = 'auth_token'

export function tokenFromHeaders(headers: IncomingHttpHeaders): string | null {
  const bearer = headers.authorization?.match(/^Bearer (.+)$/)?.[1]
  if (bearer) {
    return bearer
  }
  for (const pair of headers.cookie?.split(';') ?? []) {
    const [name, ...value] = pair.trim().split('=')
    if (name === AUTH_COOKIE) {
      return value.join('=')
    }
  }
  return null
}
