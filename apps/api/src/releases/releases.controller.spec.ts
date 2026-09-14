import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AccessGuard } from '../access'
import { JwtCookieGuard } from '../auth'
import { ReleaseService } from './release.service'
import { ReleasesController } from './releases.controller'

describe('ReleasesController', () => {
  let app: INestApplication
  let baseUrl: string

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReleasesController],
      providers: [{ provide: ReleaseService, useValue: { create: () => Promise.reject(new Error('validation should reject this request first')) } }],
    })
      .overrideGuard(JwtCookieGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AccessGuard)
      .useValue({ canActivate: () => true })
      .compile()
    app = module.createNestApplication()
    await app.init()
    await app.listen(0)
    baseUrl = await app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  it('answers 400 when the ref is blank', async () => {
    const response = await fetch(`${baseUrl}/organizations/00000000-0000-4000-8000-000000000001/instances/00000000-0000-4000-8000-000000000011/releases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: '' }),
    })

    expect(response.status).toBe(400)
  })
})
