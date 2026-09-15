import { ConflictException, HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common'
import { UserRole } from '@stackbox/contract'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import type { AuthUser } from '../access/types'
import { hashSecret } from '../common/secret'
import { ApiTokenStore } from '../db/api-token-store'
import type { Database } from '../db/client'
import { IDS, emptyTables, insertApiToken, insertMember, insertOrganization } from '../db/test-support/rows'
import { UserStore } from '../db/user-store'
import { InMemoryClock } from '../ports/fakes'
import { AuthService } from './auth.service'
import { CHOOSE_ORGANIZATION, INVALID_CREDENTIALS, INVALID_REFRESH, INVALID_SESSION, TOO_MANY_ATTEMPTS } from './errors'
import { hashPassword, passwordMetrics } from './password'
import { CredentialKind } from './token-from-headers'
import { Tokens } from './tokens'

const SECRET = 'unit-test-only-signing-secret-of-32-chars'
const NOW = new Date('2026-09-15T10:00:00Z')
const PASSWORD = 'correct horse battery'
const WRONG = 'not the password'
const MINUTE_MS = 60_000
const API_SECRET = 'sbx4Jq2pQ9rT7vW1xY3zA5bC7dE9fG1hJ3kL5mN7pQ9'
const ADA_LOGIN = { email: 'ada@example.com', password: PASSWORD }
const ADA: AuthUser = { id: IDS.user, orgId: IDS.org, email: 'ada@example.com', orgRole: UserRole.OrgAdmin }

describe('AuthService', () => {
  let db: Database
  let passwordHash: string

  beforeAll(async () => {
    db = await migratedTestDatabase()
    passwordHash = await hashPassword(PASSWORD)
  })

  afterAll(async () => {
    await db.$client.end()
  })

  beforeEach(async () => {
    await emptyTables(db)
    await insertOrganization(db, IDS.org, 'acme')
    await insertOrganization(db, IDS.otherOrg, 'globex')
    await insertMember(db, { id: IDS.user, orgId: IDS.org, name: 'Ada Lovelace', email: 'ada@example.com', role: UserRole.OrgAdmin, passwordHash })
  })

  function anAuthWorld() {
    const clock = new InMemoryClock(NOW)
    const users = new UserStore(db)
    const apiTokens = new ApiTokenStore(db)
    const service = new AuthService(users, apiTokens, new Tokens(SECRET, () => clock.now()), clock)
    return { clock, users, apiTokens, service }
  }

  async function aTwinInGlobex(): Promise<void> {
    await insertMember(db, { id: IDS.otherUser, orgId: IDS.otherOrg, name: 'Ada in globex', email: 'ada@example.com', role: UserRole.OrgMember, passwordHash })
  }

  it('rejects a login with the wrong password without revealing whether the email exists', async () => {
    const { service } = anAuthWorld()
    const before = passwordMetrics.verifyCalls

    const wrongPassword = await service.login({ email: 'ada@example.com', password: WRONG }).catch((error: unknown) => error)
    const unknownEmail = await service.login({ email: 'nobody@example.com', password: WRONG }).catch((error: unknown) => error)

    expect([
      wrongPassword instanceof UnauthorizedException && wrongPassword.getResponse(),
      unknownEmail instanceof UnauthorizedException && unknownEmail.getResponse(),
      passwordMetrics.verifyCalls - before,
    ]).toEqual([INVALID_CREDENTIALS, INVALID_CREDENTIALS, 2])
  })

  it('signs in the one account whose password matches, answering the user with its organization', async () => {
    const { service } = anAuthWorld()

    const session = await service.login(ADA_LOGIN)

    expect([session.user, session.tokens.token.split('.').length]).toEqual([
      { id: IDS.user, name: 'Ada Lovelace', email: 'ada@example.com', role: UserRole.OrgAdmin, organization: { id: IDS.org, name: 'acme' } },
      3,
    ])
  })

  it('matches the email whatever its case and surrounding spaces', async () => {
    const { service } = anAuthWorld()

    expect((await service.login({ email: '  ADA@Example.com ', password: PASSWORD })).user.id).toBe(IDS.user)
  })

  it('asks which organization when the email and password match accounts in two organizations', async () => {
    await aTwinInGlobex()
    const { service } = anAuthWorld()

    const refused = await service.login(ADA_LOGIN).catch((error: unknown) => error)

    expect(refused instanceof ConflictException && refused.getResponse()).toEqual({
      ...CHOOSE_ORGANIZATION,
      details: {
        organizations: [
          { id: IDS.org, name: 'acme' },
          { id: IDS.otherOrg, name: 'globex' },
        ],
      },
    })
  })

  it('signs in the account of the organization named when the email matches in two', async () => {
    await aTwinInGlobex()
    const { service } = anAuthWorld()

    const session = await service.login({ ...ADA_LOGIN, organization_id: IDS.otherOrg })

    expect([session.user.id, session.user.organization.name, session.user.role]).toEqual([IDS.otherUser, 'globex', UserRole.OrgMember])
  })

  it('refuses the sixth sign in after five failures for the email, before checking the password', async () => {
    const { service } = anAuthWorld()
    for (let attempt = 0; attempt < 5; attempt++) {
      await service.login({ email: 'ada@example.com', password: WRONG }).catch(() => undefined)
    }
    const before = passwordMetrics.verifyCalls

    const refused = await service.login(ADA_LOGIN).catch((error: unknown) => error)

    expect([
      refused instanceof HttpException && refused.getStatus(),
      refused instanceof HttpException && refused.getResponse(),
      passwordMetrics.verifyCalls - before,
    ]).toEqual([HttpStatus.TOO_MANY_REQUESTS, { ...TOO_MANY_ATTEMPTS, details: { retry_after_seconds: 900 } }, 0])
  })

  it('lets the email sign in again once the fifteen minute window has passed', async () => {
    const { clock, service } = anAuthWorld()
    for (let attempt = 0; attempt < 5; attempt++) {
      await service.login({ email: 'ada@example.com', password: WRONG }).catch(() => undefined)
    }
    clock.advance(15 * MINUTE_MS)

    expect((await service.login(ADA_LOGIN)).user.id).toBe(IDS.user)
  })

  it('counts a sign in that is still checking the password against the limit', async () => {
    const { service } = anAuthWorld()
    const before = passwordMetrics.verifyCalls

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => service.login({ email: 'ada@example.com', password: WRONG })),
    )
    const statuses = results.map((result) => result.status === 'rejected' && result.reason instanceof HttpException && result.reason.getStatus())

    expect([
      statuses.filter((status) => status === HttpStatus.UNAUTHORIZED).length,
      statuses.filter((status) => status === HttpStatus.TOO_MANY_REQUESTS).length,
      passwordMetrics.verifyCalls - before,
    ]).toEqual([5, 5, 5])
  })

  it('no longer holds an email that failed once, once the window has passed', async () => {
    const { clock, service } = anAuthWorld()
    await service.login({ email: 'ada@example.com', password: WRONG }).catch(() => undefined)
    clock.advance(15 * MINUTE_MS)

    await service.login({ email: 'someone-else@example.com', password: WRONG }).catch(() => undefined)

    expect(service.trackedEmails).toBe(1)
  })

  it('refuses an organization the password matches no account in, as a wrong password', async () => {
    await aTwinInGlobex()
    const { service } = anAuthWorld()
    const before = passwordMetrics.verifyCalls

    const refused = await service.login({ ...ADA_LOGIN, organization_id: '00000000-0000-4000-8000-000000000099' }).catch((error: unknown) => error)

    expect([refused instanceof UnauthorizedException && refused.getResponse(), passwordMetrics.verifyCalls - before]).toEqual([INVALID_CREDENTIALS, 2])
  })

  it('neither counts nor forgets an attempt that asks for the organization', async () => {
    await aTwinInGlobex()
    const { service } = anAuthWorld()
    for (let attempt = 0; attempt < 4; attempt++) {
      await service.login({ email: 'ada@example.com', password: WRONG }).catch(() => undefined)
    }

    const chosen = await service.login(ADA_LOGIN).catch((error: unknown) => error)
    await service.login({ email: 'ada@example.com', password: WRONG }).catch(() => undefined)
    const refused = await service.login(ADA_LOGIN).catch((error: unknown) => error)

    expect([chosen instanceof ConflictException, refused instanceof HttpException && refused.getStatus()]).toEqual([true, HttpStatus.TOO_MANY_REQUESTS])
  })

  it('forgets the failures of an email once it signs in', async () => {
    const { service } = anAuthWorld()
    const failFourTimes = async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        await service.login({ email: 'ada@example.com', password: WRONG }).catch(() => undefined)
      }
    }
    await failFourTimes()
    await service.login(ADA_LOGIN)
    await failFourTimes()

    expect((await service.login(ADA_LOGIN)).user.id).toBe(IDS.user)
  })

  it('renews a session from its refresh token, and refuses that refresh token once the account signed out', async () => {
    const { service } = anAuthWorld()
    const session = await service.login(ADA_LOGIN)

    const renewed = await service.refresh(session.tokens.refreshToken)
    await service.logout(ADA)
    const refused = await service.refresh(session.tokens.refreshToken).catch((error: unknown) => error)

    expect([renewed.user.id, refused instanceof UnauthorizedException && refused.getResponse()]).toEqual([IDS.user, INVALID_REFRESH])
  })

  it('refuses a refresh with no refresh cookie', async () => {
    const { service } = anAuthWorld()

    const refused = await service.refresh(null).catch((error: unknown) => error)

    expect(refused instanceof UnauthorizedException && refused.getResponse()).toEqual(INVALID_REFRESH)
  })

  it('authenticates a session cookie as the account with its role as stored now', async () => {
    const { service } = anAuthWorld()
    const session = await service.login(ADA_LOGIN)

    expect(await service.authenticate({ kind: CredentialKind.Session, token: session.tokens.token })).toEqual(ADA)
  })

  it('refuses an access token issued before the token version moved', async () => {
    const { service, users } = anAuthWorld()
    const session = await service.login(ADA_LOGIN)
    await users.bumpTokenVersion(IDS.user)

    const refused = await service.authenticate({ kind: CredentialKind.Session, token: session.tokens.token }).catch((error: unknown) => error)

    expect(refused instanceof UnauthorizedException && refused.getResponse()).toEqual(INVALID_SESSION)
  })

  it('refuses a request with no credential', async () => {
    const { service } = anAuthWorld()

    await expect(service.authenticate(null)).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('authenticates an api token as its user and records when it was used', async () => {
    await insertApiToken(db, { id: IDS.apiToken, userId: IDS.user, orgId: IDS.org, tokenHash: hashSecret(API_SECRET) })
    const { apiTokens, service } = anAuthWorld()

    const user = await service.authenticate({ kind: CredentialKind.ApiToken, secret: API_SECRET })

    expect([user, (await apiTokens.findByHash(hashSecret(API_SECRET)))?.lastUsedAt]).toEqual([ADA, NOW])
  })

  it('refuses a revoked api token, an expired one and a secret that matches none', async () => {
    await insertApiToken(db, { userId: IDS.user, orgId: IDS.org, tokenHash: hashSecret('revoked-secret'), revokedAt: NOW })
    await insertApiToken(db, { userId: IDS.user, orgId: IDS.org, tokenHash: hashSecret('expired-secret'), expiresAt: NOW })
    const { service } = anAuthWorld()

    const outcomes = await Promise.allSettled(
      ['revoked-secret', 'expired-secret', 'unknown-secret'].map((secret) => service.authenticate({ kind: CredentialKind.ApiToken, secret })),
    )

    expect(outcomes.map((outcome) => outcome.status === 'rejected' && outcome.reason instanceof UnauthorizedException)).toEqual([true, true, true])
  })

  it('records the use of an api token at most once a minute', async () => {
    await insertApiToken(db, { id: IDS.apiToken, userId: IDS.user, orgId: IDS.org, tokenHash: hashSecret(API_SECRET) })
    const { apiTokens, clock, service } = anAuthWorld()
    const useIt = () => service.authenticate({ kind: CredentialKind.ApiToken, secret: API_SECRET })

    await useIt()
    clock.advance(30_000)
    await useIt()
    const afterHalfAMinute = (await apiTokens.findByHash(hashSecret(API_SECRET)))?.lastUsedAt
    clock.advance(30_000)
    await useIt()

    expect([afterHalfAMinute, (await apiTokens.findByHash(hashSecret(API_SECRET)))?.lastUsedAt]).toEqual([NOW, new Date(NOW.getTime() + MINUTE_MS)])
  })
})
