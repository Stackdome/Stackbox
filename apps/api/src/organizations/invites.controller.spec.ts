import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { UserRole } from '@stackbox/contract'
import { afterEach, describe, expect, it } from 'vitest'
import { AccessGuard } from '../access'
import { AuthService, JwtCookieGuard, SessionCookies, type Session } from '../auth'
import { AUTH_SETTINGS } from '../auth/settings'
import { aUser } from './test-support/builders'
import { InviteService } from './invite.service'
import { InviteAcceptController, InvitesController } from './invites.controller'

const ORG_PATH = '/organizations/00000000-0000-4000-8000-000000000001'
const REFUSE = () => Promise.reject(new Error('validation should reject this request first'))
const GRACE = aUser({ id: 'U2', name: 'Grace Hopper', email: 'grace@example.com', orgRole: UserRole.OrgMember })
const SESSION: Session = {
  tokens: { token: 'header.access.signature', refreshToken: 'header.refresh.signature' },
  user: { id: 'U2', name: 'Grace Hopper', email: 'grace@example.com', role: UserRole.OrgMember, organization: { id: 'O1', name: 'acme' } },
}

describe('the invite controllers', () => {
  let app: INestApplication | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  async function serve(invites: Partial<InviteService>, jwtGuard: { canActivate: () => boolean } = { canActivate: () => true }): Promise<string> {
    const module = await Test.createTestingModule({
      controllers: [InvitesController, InviteAcceptController],
      providers: [
        SessionCookies,
        { provide: AUTH_SETTINGS, useValue: { secureCookies: false } },
        { provide: InviteService, useValue: invites },
        { provide: AuthService, useValue: { sessionFor: async () => SESSION } },
      ],
    })
      .overrideGuard(JwtCookieGuard)
      .useValue(jwtGuard)
      .overrideGuard(AccessGuard)
      .useValue({ canActivate: () => true })
      .compile()
    app = module.createNestApplication()
    await app.listen(0)
    return app.getUrl()
  }

  function post(baseUrl: string, path: string, body: Record<string, unknown>): Promise<Response> {
    return fetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  }

  it('answers 400 for an invite to something that is not an email, or with a role that is not an organization role', async () => {
    const baseUrl = await serve({ create: REFUSE })

    const statuses = [
      (await post(baseUrl, `${ORG_PATH}/invites`, { email: 'not an email', role: UserRole.OrgMember })).status,
      (await post(baseUrl, `${ORG_PATH}/invites`, { email: 'grace@example.com', role: 'Viewer' })).status,
    ]

    expect(statuses).toEqual([400, 400])
  })

  it('answers 400 for an accept with a password under eight characters, without a session', async () => {
    const baseUrl = await serve({ accept: REFUSE })

    expect((await post(baseUrl, '/invites/some-token/accept', { name: 'Grace Hopper', password: 'short' })).status).toBe(400)
  })

  it('signs the new member in with both cookies and answers the user alone when an invite is accepted', async () => {
    const baseUrl = await serve({ accept: async () => GRACE })

    const response = await post(baseUrl, '/invites/some-token/accept', { name: 'Grace Hopper', password: 'a long enough password' })

    const body = await response.text()
    expect([
      response.status,
      JSON.parse(body),
      response.headers.getSetCookie().some((cookie) => cookie.startsWith('auth_token=header.access.signature') && cookie.includes('HttpOnly')),
      body.includes(SESSION.tokens.token),
    ]).toEqual([200, { user: SESSION.user }, true, false])
  })

  it('accepts an invite even when the session guard would refuse the request', async () => {
    const baseUrl = await serve({ accept: async () => GRACE }, { canActivate: () => false })

    const response = await post(baseUrl, '/invites/some-token/accept', { name: 'Grace Hopper', password: 'a long enough password' })

    expect(response.status).toBe(200)
  })
})
