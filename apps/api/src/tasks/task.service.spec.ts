import { ConflictException, NotFoundException } from '@nestjs/common'
import { CoarseStatus } from '@stackbox/contract'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import type { Database } from '../db/client'
import { FIXTURE, seed } from '../db/seed'
import { TaskStore } from '../db/task-store'
import { UserStore } from '../db/user-store'
import { TaskService } from './task.service'

describe('TaskService', () => {
  let db: Database
  let service: TaskService
  let orgId: string

  beforeAll(async () => {
    db = await migratedTestDatabase()
    service = new TaskService(new TaskStore(db))
  })

  afterAll(async () => {
    await db.$client.end()
  })

  beforeEach(async () => {
    await seed(db, { passwordHash: 'scrypt$c2FsdA==$a2V5', now: new Date('2026-09-14T10:00:00Z') })
    orgId = (await new UserStore(db).findByEmail(FIXTURE.adminEmail))!.orgId
  })

  it('counts the tasks that need you over the whole organization while filtering the items', async () => {
    const list = await service.list(orgId, { status: CoarseStatus.Failed })

    expect({ items: list.items.length, needsYou: list.needs_you_count }).toEqual({ items: 1, needsYou: 2 })
  })

  it('answers not found for a task the organization does not have', async () => {
    await expect(service.cancel(orgId, '00000000-0000-4000-8000-0000000000ff')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('refuses to cancel a task that has already finished', async () => {
    const finished = (await service.list(orgId, { status: CoarseStatus.ReadyForReview })).items[0]

    await expect(service.cancel(orgId, finished.id)).rejects.toBeInstanceOf(ConflictException)
  })

  it('answers the detail of a handed over task with its report and merged pull request', async () => {
    const [row] = (await service.list(orgId, { q: 'Password reset' })).items

    const detail = await service.get(orgId, row.id)

    expect({ description: detail.report?.description, pullRequests: detail.pull_requests.map((pull) => [pull.number, pull.repository_full_name]) }).toEqual({
      description: 'Password reset link expires immediately',
      pullRequests: [[142, 'acme/shop']],
    })
  })
})
