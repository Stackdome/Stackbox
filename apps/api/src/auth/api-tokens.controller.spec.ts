import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ApiTokenService } from './api-token.service'
import { ApiTokensController } from './api-tokens.controller'
import { JwtCookieGuard } from './jwt-cookie.guard'

const REFUSE = () => Promise.reject(new Error('validation should reject this request first'))

describe('ApiTokensController', () => {
  let app: INestApplication
  let baseUrl: string

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ApiTokensController],
      providers: [{ provide: ApiTokenService, useValue: { create: REFUSE } }],
    })
      .overrideGuard(JwtCookieGuard)
      .useValue({ canActivate: () => true })
      .compile()
    app = module.createNestApplication()
    await app.listen(0)
    baseUrl = await app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  function create(body: Record<string, unknown>): Promise<Response> {
    return fetch(`${baseUrl}/api-tokens`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  }

  it('answers 400 for a token with a blank name', async () => {
    expect((await create({ name: '   ' })).status).toBe(400)
  })

  it('answers 400 for an expiry that is not a preset', async () => {
    expect((await create({ name: 'ci', expires_in_days: 45 })).status).toBe(400)
  })
})
