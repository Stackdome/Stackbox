import { UnauthorizedException } from '@nestjs/common'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import type { Database } from '../db/client'
import { UserStore } from '../db/user-store'
import { AuthService } from './auth.service'
import { passwordMetrics } from './password'
import { Tokens } from './tokens'

describe('AuthService', () => {
  let db: Database
  let service: AuthService

  beforeAll(async () => {
    db = await migratedTestDatabase()
    service = new AuthService(new UserStore(db), new Tokens('unit-test-only-signing-secret-of-32-chars'))
  })

  afterAll(async () => {
    await db.$client.end()
  })

  it('runs a scrypt derivation for an unknown email before answering invalid credentials', async () => {
    const before = passwordMetrics.verifyCalls

    await expect(service.login('nobody@example.com', 'whatever')).rejects.toBeInstanceOf(UnauthorizedException)

    expect(passwordMetrics.verifyCalls).toBe(before + 1)
  })
})
