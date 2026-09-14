import { ArtifactKind, ArtifactOwner, CheckKind, CheckOutcome, ExecutionStatus, MessageRole, PrState, ReportSource, TaskKind, TaskPhase } from '@stackbox/contract'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import { EnvironmentType } from '../ports'
import { runKey, verifyKey } from '../tasks/calc/idempotency-key'
import { aReport, aRun, aTask } from '../tasks/test-support/builders'
import { TaskEventKind } from '../tasks/types'
import type { Database } from './client'
import { artifact, execution, pullRequest, report, run, sandbox, task, taskCheck, taskEvent, taskMessage } from './schema'
import { ScreenshotNotFound, TaskStore } from './task-store'
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

  it('sums the execution costs of each run', async () => {
    await db.insert(task).values(aTask({ id: IDS.task, applicationId: IDS.application, reportId: null, phase: TaskPhase.Verifying }))
    await db.insert(run).values([aRun({ id: IDS.run1, taskId: IDS.task, number: 1 }), aRun({ id: IDS.run2, taskId: IDS.task, number: 2 })])
    await db.insert(sandbox).values({ id: IDS.sandbox, taskId: IDS.task, provider: EnvironmentType.OpenAiHosted })
    await db.insert(execution).values([
      { sandboxId: IDS.sandbox, taskId: IDS.task, runId: IDS.run1, idempotencyKey: runKey(IDS.task, 1), status: ExecutionStatus.Succeeded, costCents: 20 },
      { sandboxId: IDS.sandbox, taskId: IDS.task, runId: IDS.run1, idempotencyKey: verifyKey(IDS.task, 1), status: ExecutionStatus.Succeeded, costCents: 30 },
      { sandboxId: IDS.sandbox, taskId: IDS.task, runId: IDS.run2, idempotencyKey: runKey(IDS.task, 2), status: ExecutionStatus.Running, costCents: 15 },
    ])

    const runs = await store.runsOf(IDS.task)

    expect(runs.map((row) => [row.number, row.costCents])).toEqual([[1, 50], [2, 15]])
  })

  it('lists the artifacts of the report, the checks and the messages of a task', async () => {
    await db.insert(report).values(aReport({ id: IDS.report, applicationId: IDS.application }))
    await db.insert(task).values(aTask({ id: IDS.task, applicationId: IDS.application, reportId: IDS.report }))
    const [check] = await db.insert(taskCheck).values({ taskId: IDS.task, kind: CheckKind.ReportReproduced, outcome: CheckOutcome.Passed }).returning()
    const [message] = await db.insert(taskMessage).values({ taskId: IDS.task, role: MessageRole.Agent, body: 'Here is the log.' }).returning()
    await db.insert(artifact).values([
      { ownerType: ArtifactOwner.Report, ownerId: IDS.report, kind: ArtifactKind.Screenshot, url: 'data:image/png;base64,AA==' },
      { ownerType: ArtifactOwner.TaskCheck, ownerId: check.id, kind: ArtifactKind.TestLog, url: 'data:text/plain;base64,AA==' },
      { ownerType: ArtifactOwner.TaskMessage, ownerId: message.id, kind: ArtifactKind.Har, url: 'data:application/json;base64,AA==' },
    ])

    const artifacts = await store.artifactsOf(IDS.task)

    expect(artifacts.map((row) => row.kind)).toEqual([ArtifactKind.Screenshot, ArtifactKind.TestLog, ArtifactKind.Har])
  })

  it('creates the report and the task in intake on the repository default branch', async () => {
    const taskId = await store.create({
      orgId: IDS.org,
      applicationId: IDS.application,
      description: 'The cart badge shows zero.',
      expectedBehaviour: 'The badge counts the items.',
      reporter: 'Ada Lovelace',
      screenshotArtifactId: null,
      targetBranch: null,
      runLimit: 2,
      kind: TaskKind.Fix,
    })

    const row = await store.getDetailRow(IDS.org, taskId)
    expect({ phase: row?.summary.task.phase, branch: row?.summary.task.targetBranch, reporter: row?.report?.reporter, source: row?.report?.source }).toEqual({
      phase: TaskPhase.Intake,
      branch: 'main',
      reporter: 'Ada Lovelace',
      source: ReportSource.Web,
    })
  })

  it('refuses a screenshot the organization never uploaded', async () => {
    await expect(
      store.create({
        orgId: IDS.org,
        applicationId: IDS.application,
        description: 'The cart badge shows zero.',
        expectedBehaviour: null,
        reporter: 'Ada Lovelace',
        screenshotArtifactId: '00000000-0000-4000-8000-0000000000ff',
        targetBranch: null,
        runLimit: 2,
        kind: TaskKind.Fix,
      }),
    ).rejects.toBeInstanceOf(ScreenshotNotFound)
  })

  it('answers the open question and resumes the diverted phase when the reporter replies', async () => {
    await db.insert(task).values(aTask({ id: IDS.task, applicationId: IDS.application, reportId: null, phase: TaskPhase.NeedsInput }))
    await db.insert(taskEvent).values({ taskId: IDS.task, kind: TaskEventKind.PhaseChanged, payload: { from: TaskPhase.Implementing, to: TaskPhase.NeedsInput } })
    const [question] = await db.insert(taskMessage).values({ taskId: IDS.task, role: MessageRole.Agent, body: 'Which Safari?', blocking: true }).returning()

    const reply = await store.reply(IDS.task, 'Safari 17.4')

    const [stored] = await db.select().from(task).where(eq(task.id, IDS.task))
    const [answered] = await db.select().from(taskMessage).where(eq(taskMessage.id, question.id))
    expect({ phase: stored.phase, repliesTo: reply.repliesToId, answered: answered.answeredAt !== null }).toEqual({
      phase: TaskPhase.Implementing,
      repliesTo: question.id,
      answered: true,
    })
  })

  it('only appends a message when the task is not waiting on an answer', async () => {
    await db.insert(task).values(aTask({ id: IDS.task, applicationId: IDS.application, reportId: null, phase: TaskPhase.Implementing }))
    await db.insert(taskMessage).values({ taskId: IDS.task, role: MessageRole.Agent, body: 'Which Safari?', blocking: true })

    const reply = await store.reply(IDS.task, 'Also on Chrome.')

    const events = await db.select().from(taskEvent).where(eq(taskEvent.taskId, IDS.task))
    expect({ repliesTo: reply.repliesToId, events: events.length }).toEqual({ repliesTo: null, events: 0 })
  })
})
