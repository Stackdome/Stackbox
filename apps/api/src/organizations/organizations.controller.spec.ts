import type { ExecutionContext, INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { UserRole } from '@stackbox/contract'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AccessGuard } from '../access'
import { JwtCookieGuard } from '../auth'
import type { RequestWithCredential } from '../auth/jwt-cookie.guard'
import { CredentialKind } from '../auth/token-from-headers'
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

  it('refuses a role change and a removal through an api token', async () => {
    const module = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [{ provide: OrganizationService, useValue: { changeRole: REFUSE, remove: REFUSE } }],
    })
      .overrideGuard(JwtCookieGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest<RequestWithCredential>().credentialKind = CredentialKind.ApiToken
          return true
        },
      })
      .overrideGuard(AccessGuard)
      .useValue({ canActivate: () => true })
      .compile()
    const tokenApp = module.createNestApplication()
    await tokenApp.listen(0)
    const tokenBaseUrl = await tokenApp.getUrl()

    const changed = await fetch(`${tokenBaseUrl}${ORG_PATH}/users/00000000-0000-4000-8000-000000000007`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: UserRole.OrgMember }),
    })
    const removed = await fetch(`${tokenBaseUrl}${ORG_PATH}/users/00000000-0000-4000-8000-000000000007`, { method: 'DELETE' })

    expect([changed.status, removed.status]).toEqual([401, 401])
    await tokenApp.close()
  })

  it('answers 400 for a blank organization name and for a negative budget', async () => {
    expect([(await patch('', { name: '   ' })).status, (await patch('', { budget_cents: -1 })).status]).toEqual([400, 400])
  })

  it('answers 400 for a role that is not an organization role', async () => {
    expect((await patch('/users/00000000-0000-4000-8000-000000000007', { role: 'Developer' })).status).toBe(400)
  })
})
