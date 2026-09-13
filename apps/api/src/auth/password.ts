import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const derive = promisify(scrypt) as (password: string, salt: Buffer, length: number) => Promise<Buffer>

// A fixed scrypt hash with no matching account, run on the unknown-email login path
// so that path costs one scrypt derivation too and cannot be timed apart from a
// wrong-password login.
export const DUMMY_HASH = 'scrypt$UEhl9oDYqECK37tkPRGzdQ==$xlVr/bLbWIa+AYzmaxGH/q9UfSRgLIXq7g596fDCbFS+0ah17xNfOD0s2WLhOk4a/lVgriR+pVpkoHA/gFyJTQ=='

// Counts scrypt derivations so tests can prove the dummy-hash path ran, without a mocking library.
export const passwordMetrics = { verifyCalls: 0 }

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await derive(password, salt, 64)
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  passwordMetrics.verifyCalls += 1
  const [, salt, key] = stored.split('$')
  const expected = Buffer.from(key, 'base64')
  const actual = await derive(password, Buffer.from(salt, 'base64'), expected.length)
  return timingSafeEqual(actual, expected)
}
