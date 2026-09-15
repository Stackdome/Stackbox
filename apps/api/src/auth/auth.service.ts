import { ConflictException, HttpException, HttpStatus, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import type { components } from '@stackbox/contract'
import type { AuthUser } from '../access/types'
import { hashSecret } from '../common/secret'
import { ApiTokenStore } from '../db/api-token-store'
import { UserStore } from '../db/user-store'
import type { UserProfile } from '../organizations/types'
import { CLOCK, type Clock } from '../ports'
import { isUsable, shouldTouch } from './calc/api-token'
import { afterFailure, attemptKey, loginAllowance } from './calc/login-attempts'
import { LoginOutcomeKind, loginOutcome } from './calc/login-match'
import { CHOOSE_ORGANIZATION, INVALID_CREDENTIALS, INVALID_REFRESH, INVALID_SESSION, TOO_MANY_ATTEMPTS } from './errors'
import { DUMMY_HASH, verifyPassword } from './password'
import { presentCurrentUser } from './presenters'
import { type Credential, CredentialKind } from './token-from-headers'
import { type TokenClaims, type TokenPair, Tokens } from './tokens'

type Schemas = components['schemas']

export type Session = { tokens: TokenPair; user: Schemas['CurrentUser'] }

function authUserOf(user: UserProfile): AuthUser {
  return { id: user.id, orgId: user.orgId, email: user.email, orgRole: user.orgRole }
}

@Injectable()
export class AuthService {
  // ponytail: failed sign ins are counted in this process and keyed by email, not by address; a shared store when the api runs more than one replica.
  private readonly failedAttempts = new Map<string, Date[]>()

  constructor(
    @Inject(UserStore) private readonly users: UserStore,
    @Inject(ApiTokenStore) private readonly apiTokens: ApiTokenStore,
    @Inject(Tokens) private readonly tokens: Tokens,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async login(input: Schemas['LoginRequest']): Promise<Session> {
    const key = attemptKey(input.email)
    const now = this.clock.now()
    const allowance = loginAllowance(this.failedAttempts.get(key) ?? [], now)
    if (!allowance.allowed) {
      throw new HttpException({ ...TOO_MANY_ATTEMPTS, details: { retry_after_seconds: allowance.retryAfterSeconds } }, HttpStatus.TOO_MANY_REQUESTS)
    }
    const outcome = loginOutcome(await this.accountsMatching(input.email, input.password), input.organization_id)
    switch (outcome.kind) {
      case LoginOutcomeKind.Refused:
        this.failedAttempts.set(key, afterFailure(this.failedAttempts.get(key) ?? [], now))
        throw new UnauthorizedException(INVALID_CREDENTIALS)
      case LoginOutcomeKind.Choose:
        throw new ConflictException({ ...CHOOSE_ORGANIZATION, details: { organizations: outcome.organizations } })
      case LoginOutcomeKind.Session:
        this.failedAttempts.delete(key)
        return this.sessionFor(outcome.account)
    }
  }

  async refresh(refreshToken: string | null): Promise<Session> {
    const claims = refreshToken === null ? null : await this.tokens.verifyRefresh(refreshToken).catch(() => null)
    const account = claims && (await this.currentAccount(claims))
    if (!account) throw new UnauthorizedException(INVALID_REFRESH)
    return this.sessionFor(account)
  }

  // ponytail: one token version per account signs out every device at once; a session table when per-device sign out is asked for.
  async logout(user: AuthUser): Promise<void> {
    await this.users.bumpTokenVersion(user.id)
  }

  async authenticate(credential: Credential | null): Promise<AuthUser> {
    const account = await this.accountFor(credential)
    if (!account) throw new UnauthorizedException(INVALID_SESSION)
    return authUserOf(account)
  }

  async sessionFor(account: UserProfile): Promise<Session> {
    return { tokens: await this.tokens.issue(account), user: presentCurrentUser(account) }
  }

  async currentUser(userId: string): Promise<Schemas['CurrentUser']> {
    const account = await this.users.findById(userId)
    if (!account) throw new UnauthorizedException(INVALID_SESSION)
    return presentCurrentUser(account)
  }

  // One scrypt per candidate account, and one when there is none, so an unknown email costs what a wrong password costs.
  private async accountsMatching(email: string, password: string): Promise<UserProfile[]> {
    const accounts = await this.users.listByEmail(email)
    if (accounts.length === 0) {
      await verifyPassword(password, DUMMY_HASH)
      return []
    }
    const verified = await Promise.all(accounts.map((account) => verifyPassword(password, account.passwordHash ?? DUMMY_HASH)))
    return accounts.filter((account, index) => verified[index] && account.passwordHash !== null)
  }

  private async accountFor(credential: Credential | null): Promise<UserProfile | null> {
    if (credential === null) return null
    if (credential.kind === CredentialKind.ApiToken) return this.accountOfApiToken(credential.secret)
    const claims = await this.tokens.verifyAccess(credential.token).catch(() => null)
    return claims && this.currentAccount(claims)
  }

  private async accountOfApiToken(secret: string): Promise<UserProfile | null> {
    const now = this.clock.now()
    const token = await this.apiTokens.findByHash(hashSecret(secret))
    if (!token || !isUsable(token, now)) return null
    if (shouldTouch(token.lastUsedAt, now)) await this.apiTokens.touch(token.id, now)
    return this.users.findById(token.userId)
  }

  private async currentAccount(claims: TokenClaims): Promise<UserProfile | null> {
    const account = await this.users.findById(claims.userId)
    return account && account.tokenVersion === claims.version ? account : null
  }
}
