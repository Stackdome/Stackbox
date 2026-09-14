import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AccessGuard } from '../access'
import { JwtCookieGuard } from '../auth'
import { ApplicationService } from './application.service'
import { ApplicationsController } from './applications.controller'

describe('ApplicationsController', () => {
  let app: INestApplication
  let baseUrl: string

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [{ provide: ApplicationService, useValue: { create: () => Promise.reject(new Error('validation should reject this request first')) } }],
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

  async function createApplication(body: Record<string, unknown>): Promise<Response> {
    return fetch(`${baseUrl}/organizations/00000000-0000-4000-8000-000000000001/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'shop', repository_id: '00000000-0000-4000-8000-000000000002', ...body }),
    })
  }

  it('answers 400 when the slug breaks the slug pattern', async () => {
    const response = await createApplication({ slug: 'Shop Admin' })

    expect(response.status).toBe(400)
  })

  it('answers 400 when the name is blank', async () => {
    const response = await createApplication({ name: '   ' })

    expect(response.status).toBe(400)
  })
})
