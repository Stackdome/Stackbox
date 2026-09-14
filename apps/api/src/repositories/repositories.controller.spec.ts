import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AccessGuard } from '../access'
import { JwtCookieGuard } from '../auth'
import { RepositoriesController } from './repositories.controller'
import { RepositoryService } from './repository.service'

describe('RepositoriesController', () => {
  let app: INestApplication
  let baseUrl: string

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [RepositoriesController],
      providers: [{ provide: RepositoryService, useValue: { add: () => Promise.reject(new Error('validation should reject this request first')) } }],
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

  async function addRepositories(body: Record<string, unknown>): Promise<Response> {
    return fetch(`${baseUrl}/organizations/00000000-0000-4000-8000-000000000001/repositories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connection_id: '00000000-0000-4000-8000-000000000002', external_ids: ['gh-1001'], ...body }),
    })
  }

  it('answers 400 when no external id is given', async () => {
    const response = await addRepositories({ external_ids: [] })

    expect(response.status).toBe(400)
  })

  it('answers 400 when the connection id is not a uuid', async () => {
    const response = await addRepositories({ connection_id: 'acme' })

    expect(response.status).toBe(400)
  })
})
