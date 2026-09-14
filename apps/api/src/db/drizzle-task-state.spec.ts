import { randomUUID } from 'node:crypto'
import { InstanceStatus, MessageRole, TaskEventKind, TaskPhase } from '@stackbox/contract'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import { DEFAULT_EXPIRY_HOURS } from '../instances/calc/expiry'
import { leaseFor } from '../reconciler/calc/lease'
import { PhaseConflict } from '../reconciler/task-state'
import { reproKey } from '../tasks/calc/idempotency-key'
import { aReport, aRun, aSandbox, aTask, anExecution } from '../tasks/test-support/builders'
import type { Task } from '../tasks/types'
import type { Database } from './client'
import { DrizzleTaskState } from './drizzle-task-state'
import { applicationInstance, report, task, taskMessage } from './schema'
import { IDS, emptyTables, insertApplication, insertApplicationOn, insertGitConnection, insertOrganization, insertRepository } from './test-support/rows'

const NOW = new Date('2026-09-14T10:00:00Z')
const later = (ms: number) => new Date(NOW.getTime() + ms)

describe('DrizzleTaskState', () => {
  let db: Database
  let state: DrizzleTaskState

  beforeAll(async () => {
    db = await migratedTestDatabase()
    state = new DrizzleTaskState(db)
  })

  afterAll(async () => {
    await db.$client.end()
  })

  beforeEach(async () => {
    await emptyTables(db)
    await insertOrganization(db, IDS.org)
    await insertApplication(db, { orgId: IDS.org, repositoryId: IDS.repository, id: IDS.application, name: 'shop' })
    await insertGitConnection(db, IDS.org)
    await db.insert(report).values(aReport({ id: IDS.report, applicationId: IDS.application }))
  })

  async function aStoredTask(overrides: Partial<Task> = {}): Promise<string> {
    const id = overrides.id ?? randomUUID()
    await db.insert(task).values(aTask({ applicationId: IDS.application, reportId: IDS.report, ...overrides, id }))
    return id
  }

  it('claims a task with no lease and writes the owner and expiry onto it', async () => {
    const id = await aStoredTask()
    const lease = leaseFor('replica-a', NOW)

    const [claimed] = await state.claim(lease, NOW, 10)

    expect({ id: claimed.id, owner: claimed.leaseOwner, expiresAt: claimed.leaseExpiresAt }).toEqual({
      id,
      owner: 'replica-a',
      expiresAt: lease.expiresAt,
    })
  })

  it('refuses to claim a task whose lease has not expired, and claims it once the lease is past', async () => {
    await aStoredTask({ leaseOwner: 'replica-b', leaseExpiresAt: later(30_000) })

    const before = await state.claim(leaseFor('replica-a', NOW), NOW, 10)
    const after = await state.claim(leaseFor('replica-a', later(30_000)), later(30_000), 10)

    expect([before.length, after.length]).toEqual([0, 1])
  })

  it('claims a cancelled task still owed its cleanup and never a completed one', async () => {
    const owed = await aStoredTask({ phase: TaskPhase.Cancelled })
    await aStoredTask({ phase: TaskPhase.HandOver, completedAt: NOW })

    const claimed = await state.claim(leaseFor('replica-a', NOW), NOW, 10)

    expect(claimed.map((row) => row.id)).toEqual([owed])
  })

  it('never hands the same task to two replicas claiming at once', async () => {
    await aStoredTask()
    await aStoredTask()

    const [a, b] = await Promise.all([
      state.claim(leaseFor('replica-a', NOW), NOW, 1),
      state.claim(leaseFor('replica-b', NOW), NOW, 1),
    ])

    const ids = [...a, ...b].map((row) => row.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('makes a task claimable again once its lease is released', async () => {
    const id = await aStoredTask()
    await state.claim(leaseFor('replica-a', NOW), NOW, 10)

    await state.releaseLease(id, 'replica-a')

    expect(await state.claim(leaseFor('replica-b', NOW), NOW, 10)).toHaveLength(1)
  })

  it('does not release a lease owned by another replica', async () => {
    const id = await aStoredTask()
    await state.claim(leaseFor('replica-a', NOW), NOW, 10)

    await state.releaseLease(id, 'replica-b')

    expect(await state.claim(leaseFor('replica-c', NOW), NOW, 10)).toHaveLength(0)
  })

  it('refuses to save a task whose stored phase has moved on', async () => {
    const id = await aStoredTask({ phase: TaskPhase.Cancelled })
    const { task: loaded } = await state.load(id)

    await expect(state.saveTask({ ...loaded, phase: TaskPhase.Preparing }, TaskPhase.Intake)).rejects.toBeInstanceOf(PhaseConflict)
  })

  it('records the instance a task was given so the task row can reference it', async () => {
    const id = await aStoredTask()
    const { task: loaded } = await state.load(id)

    await state.saveTask({ ...loaded, instanceId: IDS.instance }, TaskPhase.Intake)

    const [instance] = await db.select().from(applicationInstance).where(eq(applicationInstance.id, IDS.instance))
    expect({ owner: instance.taskId, stored: (await state.load(id)).task.instanceId }).toEqual({ owner: id, stored: IDS.instance })
  })

  it('gives the instance a task was given the default 72 hour expiry', async () => {
    const id = await aStoredTask()
    const { task: loaded } = await state.load(id)

    await state.saveTask({ ...loaded, instanceId: IDS.instance }, TaskPhase.Intake)

    const [instance] = await db.select().from(applicationInstance).where(eq(applicationInstance.id, IDS.instance))
    expect((instance.expiresAt as Date).getTime() - instance.createdAt.getTime()).toBe(DEFAULT_EXPIRY_HOURS * 3_600_000)
  })

  it('marks the instance of a task torn down', async () => {
    const id = await aStoredTask()
    const { task: loaded } = await state.load(id)
    await state.saveTask({ ...loaded, instanceId: IDS.instance }, TaskPhase.Intake)

    await state.markInstanceTornDown(IDS.instance)

    const [instance] = await db.select().from(applicationInstance).where(eq(applicationInstance.id, IDS.instance))
    expect(instance.status).toBe(InstanceStatus.TornDown)
  })

  it('returns the stored execution when its idempotency key already exists', async () => {
    const id = await aStoredTask({ phase: TaskPhase.Reproducing })
    await state.saveSandbox(aSandbox({ id: IDS.sandbox, taskId: id }))
    const first = await state.insertExecution(
      anExecution({ id: IDS.execution, sandboxId: IDS.sandbox, taskId: id, idempotencyKey: reproKey(id), sessionRef: 'session-1' }),
    )

    const second = await state.insertExecution({ ...first, id: randomUUID(), sessionRef: null })

    expect(second).toEqual(first)
  })

  it('does not insert a new run whose number the task already has', async () => {
    const id = await aStoredTask({ phase: TaskPhase.Implementing })
    await state.saveRun(aRun({ id: IDS.run1, taskId: id, number: 1 }))

    await state.saveRun(aRun({ id: IDS.run2, taskId: id, number: 1 }))

    expect((await state.load(id)).runs.map((run) => run.id)).toEqual([IDS.run1])
  })

  it('loads the git connection, runs by number, and the messages and events of the task', async () => {
    const id = await aStoredTask({ phase: TaskPhase.NeedsInput })
    await state.saveRun(aRun({ id: IDS.run2, taskId: id, number: 2 }))
    await state.saveRun(aRun({ id: IDS.run1, taskId: id, number: 1 }))
    await db.insert(taskMessage).values({ id: IDS.message, taskId: id, role: MessageRole.Agent, body: 'Which browser?', blocking: true, createdAt: NOW })
    await state.appendEvent({
      id: randomUUID(),
      taskId: id,
      kind: TaskEventKind.PhaseChanged,
      payload: { from: TaskPhase.Implementing, to: TaskPhase.NeedsInput },
      at: NOW,
    })

    const snapshot = await state.load(id)

    expect({
      connection: snapshot.connection.id,
      runs: snapshot.runs.map((run) => run.number),
      messages: snapshot.messages.map((message) => message.id),
      events: snapshot.events.map((event) => event.kind),
    }).toEqual({ connection: IDS.connection, runs: [1, 2], messages: [IDS.message], events: [TaskEventKind.PhaseChanged] })
  })

  it('loads the connection a repository was added through, not the organization oldest one', async () => {
    await insertGitConnection(db, IDS.org, { id: IDS.secondConnection, installationRef: 'acme-labs-installation', accountLogin: 'acme-labs' })
    await insertRepository(db, { orgId: IDS.org, id: IDS.secondRepository, name: 'ledger', connectionId: IDS.secondConnection })
    await insertApplicationOn(db, { orgId: IDS.org, repositoryId: IDS.secondRepository, id: IDS.secondApplication, name: 'ledger' })
    const id = await aStoredTask({ applicationId: IDS.secondApplication })

    const snapshot = await state.load(id)

    expect(snapshot.connection.id).toBe(IDS.secondConnection)
  })
})
