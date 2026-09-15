import { Test } from '@nestjs/testing'
import { describe, expect, it } from 'vitest'
import { DbModule } from '../db'
import { AuthModule } from './auth.module'
import { AuthService } from './auth.service'
import { JwtCookieGuard } from './jwt-cookie.guard'
import { Tokens } from './tokens'

describe('the auth module', () => {
  it('compiles with the database module and the scripted clock', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [DbModule, AuthModule] })
      .overrideProvider(Tokens)
      .useValue({})
      .compile()

    expect([moduleRef.get(AuthService) instanceof AuthService, moduleRef.get(JwtCookieGuard) instanceof JwtCookieGuard]).toEqual([true, true])
    await moduleRef.close()
  })
})
