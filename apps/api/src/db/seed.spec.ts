import { ConnectionStatus, TaskEventKind, TaskPhase } from '@stackbox/contract'
import { and, asc, count, eq, isNotNull, sum } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import { DEMO_ORIGIN_SHA } from '../ports/fakes'
import type { Database } from './client'
import { application, artifact, execution, gitConnection, report, repository, service, task, taskEvent, userAccount } from './schema'
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

  it('seeds shop synced at the scripted head, billing stale against it and shop-admin never synced', async () => {
    await seed(db, OPTIONS)

    const rows = await db
      .select({ name: application.name, sha: application.syncedAtSha, path: application.stackfilePath })
      .from(application)
      .orderBy(asc(application.name))

    expect(rows).toEqual([
      { name: 'billing', sha: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678', path: null },
      { name: 'shop', sha: DEMO_ORIGIN_SHA, path: null },
      { name: 'shop-admin', sha: null, path: 'admin/stackfile.yaml' },
    ])
  })

  it('gives each synced application the three demo services and shop-admin none', async () => {
    await seed(db, OPTIONS)

    const rows = await db
      .select({ name: application.name, services: count(service.id) })
      .from(application)
      .leftJoin(service, eq(service.applicationId, application.id))
      .groupBy(application.name)
      .orderBy(asc(application.name))

    expect(rows).toEqual([
      { name: 'billing', services: 3 },
      { name: 'shop', services: 3 },
      { name: 'shop-admin', services: 0 },
    ])
  })

  it('seeds the acme connection with three repositories and a connection that needs re-auth', async () => {
    await seed(db, OPTIONS)

    const rows = await db
      .select({ login: gitConnection.accountLogin, status: gitConnection.status, repositories: count(repository.id) })
      .from(gitConnection)
      .leftJoin(repository, eq(repository.connectionId, gitConnection.id))
      .groupBy(gitConnection.id)
      .orderBy(asc(gitConnection.accountLogin))

    expect(rows).toEqual([
      { login: 'acme', status: ConnectionStatus.Verified, repositories: 3 },
      { login: 'needs-reauth', status: ConnectionStatus.Error, repositories: 0 },
    ])
  })
})
