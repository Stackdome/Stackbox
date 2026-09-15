import type { ExecutionContext, INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { UserRole } from '@stackbox/contract'
import { afterEach, describe, expect, it } from 'vitest'
import type { AuthUser } from '../access/types'
import { AuthController } from './auth.controller'
import { AuthService, type Session } from './auth.service'
import { SessionCookies } from './cookies'
import { JwtCookieGuard, type RequestWithCredential } from './jwt-cookie.guard'
import { AUTH_SETTINGS, type AuthSettings } from './settings'
import { CredentialKind } from './token-from-headers'

const SESSION: Session = {
  tokens: { token: 'header.access.signature', refreshToken: 'header.refresh.signature' },
  user: { id: 'U1', name: 'Ada Lovelace', email: 'ada@example.com', role: UserRole.OrgAdmin, organization: { id: 'O1', name: 'acme' } },
}

const ADA: AuthUser = { id: 'U1', orgId: 'O1', email: 'ada@example.com', orgRole: UserRole.OrgAdmin }

describe('AuthController', () => {
  let app: INestApplication | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  async function serve(settings: AuthSettings): Promise<string> {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        SessionCookies,
        { provide: AUTH_SETTINGS, useValue: settings },
        { provide: AuthService, useValue: { login: async () => SESSION, refresh: async () => SESSION, logout: async () => undefined } },
      ],
    })
      .overrideGuard(JwtCookieGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest<{ user?: AuthUser }>().user = ADA
          return true
        },
      })
      .compile()
    app = module.createNestApplication()
    await app.listen(0)
    return app.getUrl()
  }

  function post(baseUrl: string, path: string, body?: Record<string, unknown>): Promise<Response> {
    return fetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) })
  }

  function cookieParts(response: Response, name: string): string[] {
    return response.headers.getSetCookie().find((cookie) => cookie.startsWith(`${name}=`))?.split('; ') ?? []
  }

  it('sets an httpOnly cookie on a successful login and no token in the response body', async () => {
    const response = await post(await serve({ secureCookies: false }), '/auth/login', { email: 'ada@example.com', password: 'password' })

    const body = await response.text()
    expect({
      status: response.status,
      access: cookieParts(response, 'auth_token').includes('HttpOnly'),
      tokenInBody: body.includes(SESSION.tokens.token) || body.includes(SESSION.tokens.refreshToken),
      body: JSON.parse(body),
    }).toEqual({ status: 200, access: true, tokenInBody: false, body: { user: SESSION.user } })
  })

  it('keeps the refresh cookie to the refresh route, httpOnly and strict same site, and neither cookie secure outside production', async () => {
    const response = await post(await serve({ secureCookies: false }), '/auth/login', { email: 'ada@example.com', password: 'password' })

    const refresh = cookieParts(response, 'refresh_token')
    expect([
      ['Path=/api/v1/auth/refresh', 'HttpOnly', 'SameSite=Strict'].every((part) => refresh.includes(part)),
      cookieParts(response, 'auth_token').includes('Path=/'),
      [...refresh, ...cookieParts(response, 'auth_token')].includes('Secure'),
    ]).toEqual([true, true, false])
  })

  it('marks both cookies secure when the settings ask for it', async () => {
    const response = await post(await serve({ secureCookies: true }), '/auth/login', { email: 'ada@example.com', password: 'password' })

    expect([cookieParts(response, 'auth_token').includes('Secure'), cookieParts(response, 'refresh_token').includes('Secure')]).toEqual([true, true])
  })

  it('answers 400 when a login names no password', async () => {
    const response = await post(await serve({ secureCookies: false }), '/auth/login', { email: 'ada@example.com' })

    expect(response.status).toBe(400)
  })

  it('renews both cookies on refresh and answers the user alone', async () => {
    const response = await post(await serve({ secureCookies: false }), '/auth/refresh')

    expect([response.status, await response.json(), cookieParts(response, 'auth_token').length > 0]).toEqual([200, { user: SESSION.user }, true])
  })

  it('refuses to log out through an api token', async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        SessionCookies,
        { provide: AUTH_SETTINGS, useValue: { secureCookies: false } },
        { provide: AuthService, useValue: { logout: async () => undefined } },
      ],
    })
      .overrideGuard(JwtCookieGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest<RequestWithCredential>().credentialKind = CredentialKind.ApiToken
          return true
        },
      })
      .compile()
    const tokenApp = module.createNestApplication()
    await tokenApp.listen(0)

    const response = await post(await tokenApp.getUrl(), '/auth/logout')

    expect(response.status).toBe(401)
    await tokenApp.close()
  })

  it('clears both cookies on logout', async () => {
    const response = await post(await serve({ secureCookies: false }), '/auth/logout')

    expect([response.status, cookieParts(response, 'auth_token')[0], cookieParts(response, 'refresh_token')[0]]).toEqual([204, 'auth_token=', 'refresh_token='])
  })
})
