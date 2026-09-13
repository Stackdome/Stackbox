import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('password hashing', () => {
  it('accepts the password a hash was made from', async () => {
    expect(await verifyPassword('password', await hashPassword('password'))).toBe(true)
  })

  it('refuses any other password', async () => {
    expect(await verifyPassword('Password', await hashPassword('password'))).toBe(false)
  })
})
