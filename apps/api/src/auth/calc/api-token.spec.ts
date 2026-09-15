import { ApiTokenExpiryDays } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { apiTokenExpiresAt, isUsable, shouldTouch } from './api-token'

const NOW = new Date('2026-09-15T10:00:00Z')
const secondsFromNow = (seconds: number) => new Date(NOW.getTime() + seconds * 1000)

describe('the api token rules', () => {
  it('never expires a token created with no expiry, and expires a 90 day token 90 days out', () => {
    expect([apiTokenExpiresAt(undefined, NOW), apiTokenExpiresAt(null, NOW), apiTokenExpiresAt(ApiTokenExpiryDays.Quarter, NOW)]).toEqual([
      null,
      null,
      new Date('2026-12-14T10:00:00Z'),
    ])
  })

  it('refuses a revoked token and a token at or past its expiry, and uses one that never expires', () => {
    expect([
      isUsable({ revokedAt: secondsFromNow(-60), expiresAt: null }, NOW),
      isUsable({ revokedAt: null, expiresAt: NOW }, NOW),
      isUsable({ revokedAt: null, expiresAt: secondsFromNow(1) }, NOW),
      isUsable({ revokedAt: null, expiresAt: null }, NOW),
    ]).toEqual([false, false, true, true])
  })

  it('records a use when none is recorded or the last is a minute old, and not sooner', () => {
    expect([shouldTouch(null, NOW), shouldTouch(secondsFromNow(-59), NOW), shouldTouch(secondsFromNow(-60), NOW)]).toEqual([true, false, true])
  })
})
