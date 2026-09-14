import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { InstancePurpose } from '@stackbox/contract'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AccessGuard } from '../access'
import { JwtCookieGuard } from '../auth'
import { InstanceService } from './instance.service'
import { InstancesController } from './instances.controller'

const ORG_PATH = '/organizations/00000000-0000-4000-8000-000000000001'
const REFUSE = () => Promise.reject(new Error('validation should reject this request first'))

describe('InstancesController', () => {
  let app: INestApplication
  let baseUrl: string

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [InstancesController],
      providers: [{ provide: InstanceService, useValue: { spinUp: REFUSE, extendExpiry: REFUSE } }],
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

  async function post(path: string, body: Record<string, unknown>): Promise<Response> {
    return fetch(`${baseUrl}${ORG_PATH}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  }

  it('answers 400 when a spin up asks for an expiry that is not a preset', async () => {
    const response = await post('/instances', { application_id: '00000000-0000-4000-8000-000000000005', purpose: InstancePurpose.Scratch, expires_in_hours: 48 })

    expect(response.status).toBe(400)
  })

  it('answers 400 when a spin up names no purpose', async () => {
    const response = await post('/instances', { application_id: '00000000-0000-4000-8000-000000000005' })

    expect(response.status).toBe(400)
  })

  it('answers 400 when an expiry extension is not a preset', async () => {
    const response = await post('/instances/00000000-0000-4000-8000-000000000011/expiry', { hours: 12 })

    expect(response.status).toBe(400)
  })
})
