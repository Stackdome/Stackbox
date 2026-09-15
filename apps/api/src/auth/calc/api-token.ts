import type { ApiTokenExpiryDays } from '@stackbox/contract'

const DAY_MS = 24 * 60 * 60 * 1000

export const TOUCH_INTERVAL_MS = 60 * 1000

export function apiTokenExpiresAt(days: ApiTokenExpiryDays | null | undefined, now: Date): Date | null {
  return days === null || days === undefined ? null : new Date(now.getTime() + days * DAY_MS)
}

export function isUsable(token: { revokedAt: Date | null; expiresAt: Date | null }, now: Date): boolean {
  return token.revokedAt === null && (token.expiresAt === null || token.expiresAt.getTime() > now.getTime())
}

export function shouldTouch(lastUsedAt: Date | null, now: Date): boolean {
  return lastUsedAt === null || now.getTime() - lastUsedAt.getTime() >= TOUCH_INTERVAL_MS
}
