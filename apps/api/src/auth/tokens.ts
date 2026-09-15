import { randomUUID } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'

export const ACCESS_TOKEN_SECONDS = 15 * 60
export const REFRESH_TOKEN_SECONDS = 7 * 24 * 60 * 60

const TokenKind = { Access: 'access', Refresh: 'refresh' } as const
type TokenKind = (typeof TokenKind)[keyof typeof TokenKind]

export type TokenPair = { token: string; refreshToken: string }

export type TokenSubject = { id: string; tokenVersion: number }

export type TokenClaims = { userId: string; version: number }

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

  async issue(subject: TokenSubject): Promise<TokenPair> {
    const [token, refreshToken] = await Promise.all([
      this.sign(subject, TokenKind.Access, ACCESS_TOKEN_SECONDS),
      this.sign(subject, TokenKind.Refresh, REFRESH_TOKEN_SECONDS),
    ])
    return { token, refreshToken }
  }

  verifyAccess(token: string): Promise<TokenClaims> {
    return this.verify(token, TokenKind.Access)
  }

  verifyRefresh(token: string): Promise<TokenClaims> {
    return this.verify(token, TokenKind.Refresh)
  }

  private sign(subject: TokenSubject, kind: TokenKind, lifetimeSeconds: number): Promise<string> {
    const issuedAt = Math.floor(this.now().getTime() / 1000)
    return new SignJWT({ ver: subject.tokenVersion, kind })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(subject.id)
      .setJti(randomUUID())
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + lifetimeSeconds)
      .sign(this.key)
  }

  private async verify(token: string, kind: TokenKind): Promise<TokenClaims> {
    const { payload } = await jwtVerify(token, this.key, { algorithms: ['HS256'], currentDate: this.now() })
    if (payload.kind !== kind || typeof payload.sub !== 'string' || typeof payload.ver !== 'number') {
      throw new Error(`expected a ${kind} token`)
    }
    return { userId: payload.sub, version: payload.ver }
  }
}
