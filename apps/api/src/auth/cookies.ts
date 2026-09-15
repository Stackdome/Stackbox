import type { IncomingHttpHeaders } from 'node:http'
import { Inject, Injectable } from '@nestjs/common'
import { AUTH_SETTINGS, type AuthSettings } from './settings'
import { ACCESS_TOKEN_SECONDS, REFRESH_TOKEN_SECONDS, type TokenPair } from './tokens'

export const AUTH_COOKIE = 'auth_token'

export const REFRESH_COOKIE = 'refresh_token'

// Under the global prefix, so the refresh token travels to the refresh route and nowhere else.
export const REFRESH_COOKIE_PATH = '/api/v1/auth/refresh'

type CookieOptions = { httpOnly: boolean; sameSite: 'strict'; secure: boolean; path: string; maxAge?: number }

export type CookieResponse = {
  cookie(name: string, value: string, options: CookieOptions): void
  clearCookie(name: string, options: CookieOptions): void
}

export function cookieFrom(headers: IncomingHttpHeaders, name: string): string | null {
  for (const pair of headers.cookie?.split(';') ?? []) {
    const [key, ...value] = pair.trim().split('=')
    if (key === name) return value.join('=')
  }
  return null
}

@Injectable()
export class SessionCookies {
  constructor(@Inject(AUTH_SETTINGS) private readonly settings: AuthSettings) {}

  set(response: CookieResponse, tokens: TokenPair): void {
    response.cookie(AUTH_COOKIE, tokens.token, { ...this.options('/'), maxAge: ACCESS_TOKEN_SECONDS * 1000 })
    response.cookie(REFRESH_COOKIE, tokens.refreshToken, { ...this.options(REFRESH_COOKIE_PATH), maxAge: REFRESH_TOKEN_SECONDS * 1000 })
  }

  clear(response: CookieResponse): void {
    response.clearCookie(AUTH_COOKIE, this.options('/'))
    response.clearCookie(REFRESH_COOKIE, this.options(REFRESH_COOKIE_PATH))
  }

  private options(path: string): CookieOptions {
    return { httpOnly: true, sameSite: 'strict', secure: this.settings.secureCookies, path }
  }
}
