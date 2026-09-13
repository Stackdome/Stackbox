import { randomUUID } from 'node:crypto'
import type { UserRole } from '@stackbox/contract'
import { SignJWT, jwtVerify } from 'jose'
import type { AuthUser } from '../access/types'

export const ACCESS_TOKEN_SECONDS = 15 * 60
export const REFRESH_TOKEN_SECONDS = 7 * 24 * 60 * 60

const TokenKind = { Access: 'access', Refresh: 'refresh' } as const
type TokenKind = (typeof TokenKind)[keyof typeof TokenKind]

export type TokenPair = { token: string; refreshToken: string }

export function requireJwtSecret(secret: string | undefined): string {
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to at least 32 characters')
  }
  return secret
}

export class Tokens {
  private readonly key: Uint8Array

  constructor(
    secret: string,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.key = new TextEncoder().encode(secret)
  }

  async issue(user: AuthUser): Promise<TokenPair> {
    const [token, refreshToken] = await Promise.all([
      this.sign(user, TokenKind.Access, ACCESS_TOKEN_SECONDS),
      this.sign(user, TokenKind.Refresh, REFRESH_TOKEN_SECONDS),
    ])
    return { token, refreshToken }
  }

  verifyAccess(token: string): Promise<AuthUser> {
    return this.verify(token, TokenKind.Access)
  }

  verifyRefresh(token: string): Promise<AuthUser> {
    return this.verify(token, TokenKind.Refresh)
  }

  private sign(user: AuthUser, kind: TokenKind, lifetimeSeconds: number): Promise<string> {
    const issuedAt = Math.floor(this.now().getTime() / 1000)
    return new SignJWT({ org: user.orgId, email: user.email, role: user.orgRole, kind })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setJti(randomUUID())
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + lifetimeSeconds)
      .sign(this.key)
  }

  private async verify(token: string, kind: TokenKind): Promise<AuthUser> {
    const { payload } = await jwtVerify(token, this.key, { algorithms: ['HS256'], currentDate: this.now() })
    if (payload.kind !== kind) {
      throw new Error(`expected a ${kind} token`)
    }
    return {
      id: payload.sub as string,
      orgId: payload.org as string,
      email: payload.email as string,
      orgRole: payload.role as UserRole,
    }
  }
}
