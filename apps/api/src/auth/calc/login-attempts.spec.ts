import { describe, expect, it } from 'vitest'
import { afterFailure, attemptKey, loginAllowance } from './login-attempts'

const T0 = new Date('2026-09-15T10:00:00Z')
const minutesAfterT0 = (minutes: number) => new Date(T0.getTime() + minutes * 60_000)
const failuresAt = (...minutes: number[]) => minutes.map(minutesAfterT0)

describe('the login rate limit', () => {
  it('allows a sign in for an email with no failed attempt', () => {
    expect(loginAllowance([], T0)).toEqual({ allowed: true, retryAfterSeconds: 0 })
  })

  it('allows the attempt after four failures and refuses the one after five', () => {
    expect([loginAllowance(failuresAt(0, 1, 2, 3), minutesAfterT0(4)).allowed, loginAllowance(failuresAt(0, 1, 2, 3, 4), minutesAfterT0(5)).allowed]).toEqual([
      true,
      false,
    ])
  })

  it('answers the seconds left in the window, rounded up', () => {
    const now = new Date(minutesAfterT0(10).getTime() + 500)

    expect(loginAllowance(failuresAt(0, 1, 2, 3, 4), now)).toEqual({ allowed: false, retryAfterSeconds: 300 })
  })

  it('opens a new window once fifteen minutes have passed since the first failure', () => {
    const now = minutesAfterT0(15)

    expect([loginAllowance(failuresAt(0, 1, 2, 3, 4), now).allowed, afterFailure(failuresAt(0, 1, 2, 3, 4), now)]).toEqual([true, [now]])
  })

  it('adds a failure to the window still open', () => {
    expect(afterFailure(failuresAt(0, 1), minutesAfterT0(2))).toEqual(failuresAt(0, 1, 2))
  })

  it('keys attempts by the trimmed lower-cased email', () => {
    expect(attemptKey('  Ada@Example.com ')).toBe('ada@example.com')
  })
})
