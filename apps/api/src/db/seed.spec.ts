import { TaskEventKind, TaskPhase } from '@stackbox/contract'
import { and, eq, isNotNull, sum } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import type { Database } from './client'
import { artifact, execution, report, task, taskEvent, userAccount } from './schema'
import { FIXTURE, seed } from './seed'

const OPTIONS = { passwordHash: 'scrypt$c2FsdA==$a2V5', now: new Date('2026-09-14T10:00:00Z') }

describe('seed', () => {
  let db: Database

  beforeAll(async () => {
    db = await migratedTestDatabase()
  })

  afterAll(async () => {
    await db.$client.end()
  })

  it('leaves one fixture admin, nine tasks and one report screenshot however often it runs', async () => {
    await seed(db, OPTIONS)
    await seed(db, OPTIONS)

    const admins = await db.select().from(userAccount).where(eq(userAccount.email, FIXTURE.adminEmail))
    const tasks = await db.select({ id: task.id }).from(task)
    const screenshots = await db.select({ id: artifact.id }).from(artifact).innerJoin(report, eq(artifact.ownerId, report.id))
    expect([admins.length, tasks.length, screenshots.length]).toEqual([1, 9, 1])
  })

  it('runs a cancelled fixture task again on the next seed', async () => {
    await seed(db, OPTIONS)
    await db.update(task).set({ phase: TaskPhase.Cancelled }).where(eq(task.phase, TaskPhase.Reproducing))

    await seed(db, OPTIONS)

    expect(await db.select({ id: task.id }).from(task).where(eq(task.phase, TaskPhase.Reproducing))).toHaveLength(1)
  })

  it('records the phase each waiting task diverted from, so a reply can resume it', async () => {
    await seed(db, OPTIONS)

    const diversions = await db
      .select({ payload: taskEvent.payload })
      .from(taskEvent)
      .innerJoin(task, eq(taskEvent.taskId, task.id))
      .where(and(eq(task.phase, TaskPhase.NeedsInput), eq(taskEvent.kind, TaskEventKind.PhaseChanged)))

    expect(diversions.filter((row) => row.payload.to === TaskPhase.NeedsInput).map((row) => row.payload.from).sort()).toEqual([
      TaskPhase.Implementing,
      TaskPhase.Verifying,
    ])
  })

  it('seeds the budget fixture already past its one cent budget', async () => {
    await seed(db, OPTIONS)

    const [budgeted] = await db
      .select({ budget: task.budgetCents, spent: sum(execution.costCents).mapWith(Number) })
      .from(task)
      .innerJoin(report, eq(task.reportId, report.id))
      .innerJoin(execution, eq(execution.taskId, task.id))
      .where(eq(report.description, FIXTURE.budgetTaskDescription))
      .groupBy(task.budgetCents)

    expect(budgeted).toEqual({ budget: 1, spent: 5 })
  })

  it('leaves fixture tasks with fabricated references leased so the reconciler skips them', async () => {
    await seed(db, OPTIONS)

    const leased = await db.select({ phase: task.phase, leaseOwner: task.leaseOwner }).from(task).where(isNotNull(task.leaseExpiresAt))

    expect(leased.map((row) => row.phase).sort()).toEqual(
      [TaskPhase.NeedsInput, TaskPhase.NeedsInput, TaskPhase.Reproducing, TaskPhase.Deploying].sort(),
    )
    expect(leased.every((row) => row.leaseOwner === 'seed-fixture')).toBe(true)
  })
})
