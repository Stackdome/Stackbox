import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AccessGuard } from '../access'
import { JwtCookieGuard } from '../auth'
import { TasksController } from './tasks.controller'
import { TaskService } from './task.service'

describe('TasksController', () => {
  let app: INestApplication
  let baseUrl: string

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TaskService, useValue: { create: () => Promise.reject(new Error('validation should reject this request first')) } }],
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

  async function createTask(body: Record<string, unknown>): Promise<Response> {
    return fetch(`${baseUrl}/organizations/00000000-0000-4000-8000-000000000001/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ application_id: '00000000-0000-4000-8000-000000000002', description: 'x', ...body }),
    })
  }

  it('answers 400 when the screenshot artifact id is not a uuid', async () => {
    const response = await createTask({ screenshot_artifact_id: 'nope' })

    expect(response.status).toBe(400)
  })

  it('answers 400 when the description is over the length cap', async () => {
    const response = await createTask({ description: 'x'.repeat(10001) })

    expect(response.status).toBe(400)
  })
})
