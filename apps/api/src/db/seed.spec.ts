import { TaskPhase } from '@stackbox/contract'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import type { Database } from './client'
import { task, userAccount } from './schema'
import { FIXTURE, seed } from './seed'

describe('seed', () => {
  let db: Database

  beforeAll(async () => {
    db = await migratedTestDatabase()
  })

  afterAll(async () => {
    await db.$client.end()
  })

  it('leaves one fixture admin and eight tasks however often it runs', async () => {
    const options = { passwordHash: 'scrypt$c2FsdA==$a2V5', now: new Date('2026-09-14T10:00:00Z') }

    await seed(db, options)
    await seed(db, options)

    const admins = await db.select().from(userAccount).where(eq(userAccount.email, FIXTURE.adminEmail))
    const tasks = await db.select({ id: task.id }).from(task)
    expect([admins.length, tasks.length]).toEqual([1, 8])
  })

  it('runs a cancelled fixture task again on the next seed', async () => {
    const options = { passwordHash: 'scrypt$c2FsdA==$a2V5', now: new Date('2026-09-14T10:00:00Z') }
    await seed(db, options)
    await db.update(task).set({ phase: TaskPhase.Cancelled }).where(eq(task.phase, TaskPhase.Reproducing))

    await seed(db, options)

    expect(await db.select({ id: task.id }).from(task).where(eq(task.phase, TaskPhase.Reproducing))).toHaveLength(1)
  })
})
