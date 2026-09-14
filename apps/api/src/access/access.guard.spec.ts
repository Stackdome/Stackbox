import { type ExecutionContext, NotFoundException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import { ApplicationStore } from '../db/application-store'
import type { Database } from '../db/client'
import { PolicyStore } from '../db/policy-store'
import { FIXTURE, seed } from '../db/seed'
import { TaskStore } from '../db/task-store'
import { UserStore } from '../db/user-store'
import { AccessGuard } from './access.guard'
import { AccessService } from './access.service'
import { ApplicationSource, RequirePermission } from './require-permission.decorator'
import { Action, type AuthUser } from './types'

function aCreateRequest(user: AuthUser, body: unknown): ExecutionContext {
  const handler = () => undefined
  RequirePermission('/organizations/:org_id/applications/:application_id/tasks', Action.Create, ApplicationSource.Body)(handler)
  const request = { user, params: { org_id: user.orgId }, body }
  return { getHandler: () => handler, switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext
}

function aPathRequest(user: AuthUser, applicationId: string): ExecutionContext {
  const handler = () => undefined
  RequirePermission('/organizations/:org_id/applications/:application_id', Action.Read, ApplicationSource.Path)(handler)
  const request = { user, params: { org_id: user.orgId, application_id: applicationId }, body: {} }
  return { getHandler: () => handler, switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext
}

describe('AccessGuard', () => {
  let db: Database
  let guard: AccessGuard
  let admin: AuthUser

  beforeAll(async () => {
    db = await migratedTestDatabase()
    await seed(db, { passwordHash: 'scrypt$c2FsdA==$a2V5', now: new Date('2026-09-14T10:00:00Z') })
    guard = new AccessGuard(new Reflector(), new AccessService(new PolicyStore(db)), new TaskStore(db), new ApplicationStore(db))
    const profile = await new UserStore(db).findByEmail(FIXTURE.adminEmail)
    admin = { id: profile!.id, orgId: profile!.orgId, email: profile!.email, orgRole: profile!.orgRole }
  })

  afterAll(async () => {
    await db.$client.end()
  })

  it('answers not found when the body names no application of the organization', async () => {
    const outcomes = await Promise.allSettled([
      guard.canActivate(aCreateRequest(admin, { application_id: 'not-a-uuid' })),
      guard.canActivate(aCreateRequest(admin, { application_id: '00000000-0000-4000-8000-0000000000ff' })),
      guard.canActivate(aCreateRequest(admin, {})),
    ])

    expect(outcomes.map((outcome) => outcome.status === 'rejected' && outcome.reason instanceof NotFoundException)).toEqual([true, true, true])
    expect(outcomes.map((outcome) => outcome.status === 'rejected' && outcome.reason instanceof NotFoundException && outcome.reason.getResponse())).toEqual([
      { code: 'unknown_application', message: 'application not found' },
      { code: 'unknown_application', message: 'application not found' },
      { code: 'unknown_application', message: 'application not found' },
    ])
  })

  it('lets the admin create a task on an application of the organization', async () => {
    const [shop] = await new ApplicationStore(db).listByOrg(admin.orgId)

    expect(await guard.canActivate(aCreateRequest(admin, { application_id: shop.id }))).toBe(true)
  })

  it('answers not found when the path names no application of the organization', async () => {
    const outcomes = await Promise.allSettled([
      guard.canActivate(aPathRequest(admin, 'not-a-uuid')),
      guard.canActivate(aPathRequest(admin, '00000000-0000-4000-8000-0000000000ff')),
    ])

    expect(outcomes.map((outcome) => outcome.status === 'rejected' && outcome.reason instanceof NotFoundException)).toEqual([true, true])
  })

  it('lets the admin read an application of the organization named in the path', async () => {
    const [shop] = await new ApplicationStore(db).listByOrg(admin.orgId)

    expect(await guard.canActivate(aPathRequest(admin, shop.id))).toBe(true)
  })
})
