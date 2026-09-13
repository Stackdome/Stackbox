import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import type { components } from '@stackbox/contract'
import type { AuthUser } from '../access/types'
import { UserStore } from '../db'
import type { UserProfile } from '../organizations/types'
import { DUMMY_HASH, verifyPassword } from './password'
import { presentUser } from './present-user'
import { Tokens, type TokenPair } from './tokens'

type User = components['schemas']['User']

export type Session = TokenPair & { user: User }

function authUserOf(user: UserProfile): AuthUser {
  return { id: user.id, orgId: user.orgId, email: user.email, orgRole: user.orgRole }
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(UserStore) private readonly users: UserStore,
    @Inject(Tokens) private readonly tokens: Tokens,
  ) {}

  async login(email: string, password: string): Promise<Session> {
    const user = await this.users.findByEmail(email)
    // Runs scrypt on the unknown-email and no-hash paths too, so all three answer the
    // same 401 in about the same time and a script cannot use timing to find an email.
    if (!user?.passwordHash) {
      await verifyPassword(password, DUMMY_HASH)
      throw new UnauthorizedException({ message: 'invalid credentials' })
    }
    if (!(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException({ message: 'invalid credentials' })
    }
    return { ...(await this.tokens.issue(authUserOf(user))), user: presentUser(user) }
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const claims = await this.tokens.verifyRefresh(refreshToken).catch(() => {
      throw new UnauthorizedException({ message: 'invalid or expired refresh token' })
    })
    const user = await this.users.findById(claims.id)
    if (!user) {
      throw new UnauthorizedException({ message: 'invalid or expired refresh token' })
    }
    return this.tokens.issue(authUserOf(user))
  }

  async currentUser(id: string): Promise<User> {
    const user = await this.users.findById(id)
    if (!user) {
      throw new UnauthorizedException({ message: 'auth token is invalid' })
    }
    return presentUser(user)
  }
}
