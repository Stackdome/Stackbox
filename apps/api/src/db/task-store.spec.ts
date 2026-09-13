import { MessageRole, PrState, ReportSource, TaskPhase } from '@stackbox/contract'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import { aReport, aRun, aTask } from '../tasks/test-support/builders'
import { TaskEventKind } from '../tasks/types'
import type { Database } from './client'
import { pullRequest, report, run, task, taskEvent, taskMessage } from './schema'
import { TaskStore } from './task-store'
import { IDS, emptyTables, insertApplication, insertOrganization } from './test-support/rows'

describe('TaskStore', () => {
  let db: Database
  let store: TaskStore

  beforeAll(async () => {
    db = await migratedTestDatabase()
    store = new TaskStore(db)
  })

  afterAll(async () => {
    await db.$client.end()
  })

  beforeEach(async () => {
    await emptyTables(db)
    await insertOrganization(db, IDS.org)
    await insertApplication(db, { orgId: IDS.org, repositoryId: IDS.repository, id: IDS.application, name: 'shop' })
  })

  it('lists a task with its application, report, current run, newest blocking question and pull request', async () => {
    await db.insert(report).values(aReport({ id: IDS.report, applicationId: IDS.application }))
    await db.insert(task).values(aTask({ id: IDS.task, applicationId: IDS.application, reportId: IDS.report, phase: TaskPhase.NeedsInput }))
    await db.insert(run).values([
      aRun({ id: IDS.run1, taskId: IDS.task, number: 1 }),
      aRun({ id: IDS.run2, taskId: IDS.task, number: 2 }),
    ])
    await db.insert(taskMessage).values([
      { taskId: IDS.task, role: MessageRole.Agent, body: 'Is this the checkout page?', blocking: true, createdAt: new Date('2026-09-13T09:00:00Z') },
      { taskId: IDS.task, role: MessageRole.Agent, body: 'Which browser shows it?', blocking: true, createdAt: new Date('2026-09-13T10:00:00Z') },
    ])
    await db.insert(pullRequest).values({ taskId: IDS.task, repositoryId: IDS.repository, number: 142, isDraft: false, state: PrState.Merged })

    const [row] = await store.listRows(IDS.org)

    expect({ ...row, task: undefined }).toEqual({
      task: undefined,
      application: { id: IDS.application, name: 'shop' },
      report: { description: 'The save button does nothing.', source: ReportSource.Web },
      runNumber: 2,
      blockingQuestion: 'Which browser shows it?',
      pullRequest: { number: 142, isDraft: false, state: PrState.Merged, repositoryFullName: 'acme/shop' },
    })
  })

  it('does not list the tasks of another organization', async () => {
    await insertOrganization(db, IDS.otherOrg, 'globex')
    await insertApplication(db, { orgId: IDS.otherOrg, repositoryId: IDS.otherRepository, id: IDS.otherApplication, name: 'ledger' })
    await db.insert(task).values(aTask({ id: IDS.otherTask, applicationId: IDS.otherApplication, reportId: null }))

    expect(await store.listRows(IDS.org)).toEqual([])
  })

  it('finds the application a task belongs to within its organization', async () => {
    await db.insert(task).values(aTask({ id: IDS.task, applicationId: IDS.application, reportId: null }))

    expect(await store.applicationIdOf(IDS.org, IDS.task)).toBe(IDS.application)
  })

  it('moves a running task to cancelled and leaves completion to the reconciler', async () => {
    await db.insert(task).values(aTask({ id: IDS.task, applicationId: IDS.application, reportId: null, phase: TaskPhase.Reproducing }))

    const row = await store.cancel(IDS.org, IDS.task)

    expect({ phase: row?.task.phase, completedAt: row?.task.completedAt }).toEqual({ phase: TaskPhase.Cancelled, completedAt: null })
  })

  it('records the cancel as a phase change from the phase the task left', async () => {
    await db.insert(task).values(aTask({ id: IDS.task, applicationId: IDS.application, reportId: null, phase: TaskPhase.Reproducing }))

    await store.cancel(IDS.org, IDS.task)

    const events = await db.select({ kind: taskEvent.kind, payload: taskEvent.payload }).from(taskEvent).where(eq(taskEvent.taskId, IDS.task))
    expect(events).toEqual([{ kind: TaskEventKind.PhaseChanged, payload: { from: TaskPhase.Reproducing, to: TaskPhase.Cancelled } }])
  })

  it('leaves a finished task untouched when asked to cancel it', async () => {
    await db.insert(task).values(aTask({ id: IDS.task, applicationId: IDS.application, reportId: null, phase: TaskPhase.HandOver }))

    const result = await store.cancel(IDS.org, IDS.task)
    const [after] = await db.select({ phase: task.phase }).from(task).where(eq(task.id, IDS.task))

    expect([result, after.phase]).toEqual([null, TaskPhase.HandOver])
  })
})
