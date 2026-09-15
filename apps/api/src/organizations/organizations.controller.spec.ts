import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AccessGuard } from '../access'
import { JwtCookieGuard } from '../auth'
import { OrganizationService } from './organization.service'
import { OrganizationsController } from './organizations.controller'

const ORG_PATH = '/organizations/00000000-0000-4000-8000-000000000001'
const REFUSE = () => Promise.reject(new Error('validation should reject this request first'))

describe('OrganizationsController', () => {
  let app: INestApplication
  let baseUrl: string

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [{ provide: OrganizationService, useValue: { update: REFUSE, changeRole: REFUSE } }],
    })
      .overrideGuard(JwtCookieGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AccessGuard)
      .useValue({ canActivate: () => true })
      .compile()
    app = module.createNestApplication()
    await app.listen(0)
    baseUrl = await app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  function patch(path: string, body: Record<string, unknown>): Promise<Response> {
    return fetch(`${baseUrl}${ORG_PATH}${path}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  }

  it('answers 400 for a blank organization name and for a negative budget', async () => {
    expect([(await patch('', { name: '   ' })).status, (await patch('', { budget_cents: -1 })).status]).toEqual([400, 400])
  })

  it('answers 400 for a role that is not an organization role', async () => {
    expect((await patch('/users/00000000-0000-4000-8000-000000000007', { role: 'Developer' })).status).toBe(400)
  })
})
