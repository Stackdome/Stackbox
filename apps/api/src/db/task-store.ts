import { Inject, Injectable } from '@nestjs/common'
import { ArtifactKind, ArtifactOwner, MessageRole, ReportSource, TaskPhase } from '@stackbox/contract'
import { and, asc, desc, eq, inArray, isNull, max, type SQL, sum } from 'drizzle-orm'
import { phaseAfterReply } from '../tasks/calc/reply'
import { isTerminal } from '../tasks/calc/phase-transitions'
import type { Artifact, CheckRow, NewTask, RunRow, TaskDetailRow, TaskEvent, TaskMessage } from '../tasks/types'
import { TaskEventKind, type TaskListRow } from '../tasks/types'
import { DATABASE_CONNECTION, type Database } from './client'
import { application, artifact, execution, pullRequest, report, repository, run, task, taskCheck, taskEvent, taskMessage } from './schema'

export class ScreenshotNotFound extends Error {
  constructor(artifactId: string) {
    super(`no unattached screenshot ${artifactId} in this organization`)
  }
}

@Injectable()
export class TaskStore {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  listRows(orgId: string): Promise<TaskListRow[]> {
    return this.rowsWhere(eq(application.orgId, orgId))
  }

  async getRow(orgId: string, taskId: string): Promise<TaskListRow | null> {
    const [row] = await this.rowsWhere(and(eq(application.orgId, orgId), eq(task.id, taskId)))
    return row ?? null
  }

  async applicationIdOf(orgId: string, taskId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ applicationId: task.applicationId })
      .from(task)
      .innerJoin(application, eq(task.applicationId, application.id))
      .where(and(eq(application.orgId, orgId), eq(task.id, taskId)))
    return row?.applicationId ?? null
  }

  async cancel(orgId: string, taskId: string): Promise<TaskListRow | null> {
    const cancelled = await this.db.transaction(async (tx) => {
      const [current] = await tx
        .select({ phase: task.phase })
        .from(task)
        .innerJoin(application, eq(task.applicationId, application.id))
        .where(and(eq(application.orgId, orgId), eq(task.id, taskId)))
        .for('update', { of: task })
      if (!current || isTerminal(current.phase)) {
        return false
      }
      // completedAt stays null: the reconciler's cleanup tick sets it once the sandbox is gone.
      await tx.update(task).set({ phase: TaskPhase.Cancelled, completedAt: null }).where(eq(task.id, taskId))
      await tx.insert(taskEvent).values({
        taskId,
        kind: TaskEventKind.PhaseChanged,
        payload: { from: current.phase, to: TaskPhase.Cancelled },
      })
      return true
    })
    return cancelled ? this.getRow(orgId, taskId) : null
  }

  async getDetailRow(orgId: string, taskId: string): Promise<TaskDetailRow | null> {
    const summary = await this.getRow(orgId, taskId)
    if (!summary) {
      return null
    }
    const { reportId } = summary.task
    const [reports, screenshots, pulls] = await Promise.all([
      reportId === null ? Promise.resolve([] as (typeof report.$inferSelect)[]) : this.db.select().from(report).where(eq(report.id, reportId)),
      reportId === null ? Promise.resolve([] as Artifact[]) : this.artifactsOwnedBy(ArtifactOwner.Report, [reportId]),
      this.db
        .select({ pull: pullRequest, repositoryFullName: repository.fullName })
        .from(pullRequest)
        .innerJoin(repository, eq(pullRequest.repositoryId, repository.id))
        .where(eq(pullRequest.taskId, taskId))
        .orderBy(asc(pullRequest.number)),
    ])
    const [written] = reports
    return {
      summary,
      report: written
        ? {
          id: written.id,
          description: written.description,
          expectedBehaviour: written.expectedBehaviour,
          reporter: written.reporter,
          source: written.source,
          screenshots: screenshots.filter((row) => row.kind === ArtifactKind.Screenshot),
        }
        : null,
      pullRequests: pulls.map(({ pull, repositoryFullName }) => ({
        number: pull.number,
        isDraft: pull.isDraft,
        state: pull.state,
        headRef: pull.headRef,
        baseRef: pull.baseRef,
        repositoryFullName,
      })),
    }
  }

  eventsOf(taskId: string): Promise<TaskEvent[]> {
    return this.db.select().from(taskEvent).where(eq(taskEvent.taskId, taskId)).orderBy(asc(taskEvent.at), asc(taskEvent.id))
  }

  async checksOf(taskId: string): Promise<CheckRow[]> {
    const rows = await this.db
      .select({ check: taskCheck, runNumber: run.number })
      .from(taskCheck)
      .leftJoin(run, eq(taskCheck.runId, run.id))
      .where(eq(taskCheck.taskId, taskId))
      .orderBy(asc(taskCheck.ranAt), asc(taskCheck.id))
    const owned = await this.artifactsOwnedBy(ArtifactOwner.TaskCheck, rows.map((row) => row.check.id))
    return rows.map((row) => ({ ...row.check, runNumber: row.runNumber, artifacts: owned.filter((item) => item.ownerId === row.check.id) }))
  }

  async runsOf(taskId: string): Promise<RunRow[]> {
    const [runs, costs] = await Promise.all([
      this.db.select().from(run).where(eq(run.taskId, taskId)).orderBy(asc(run.number)),
      this.db
        .select({ runId: execution.runId, cents: sum(execution.costCents).mapWith(Number) })
        .from(execution)
        .where(eq(execution.taskId, taskId))
        .groupBy(execution.runId),
    ])
    return runs.map((row) => ({ ...row, costCents: costs.find((cost) => cost.runId === row.id)?.cents ?? 0 }))
  }

  messagesOf(taskId: string): Promise<TaskMessage[]> {
    return this.db.select().from(taskMessage).where(eq(taskMessage.taskId, taskId)).orderBy(asc(taskMessage.createdAt), asc(taskMessage.id))
  }

  async artifactsOf(taskId: string): Promise<Artifact[]> {
    const [owner] = await this.db.select({ reportId: task.reportId }).from(task).where(eq(task.id, taskId))
    const [checks, messages] = await Promise.all([
      this.db.select({ id: taskCheck.id }).from(taskCheck).where(eq(taskCheck.taskId, taskId)),
      this.db.select({ id: taskMessage.id }).from(taskMessage).where(eq(taskMessage.taskId, taskId)),
    ])
    const lists = await Promise.all([
      this.artifactsOwnedBy(ArtifactOwner.Report, owner?.reportId ? [owner.reportId] : []),
      this.artifactsOwnedBy(ArtifactOwner.TaskCheck, checks.map((row) => row.id)),
      this.artifactsOwnedBy(ArtifactOwner.TaskMessage, messages.map((row) => row.id)),
    ])
    return lists.flat()
  }

  private artifactsOwnedBy(ownerType: ArtifactOwner, ownerIds: string[]): Promise<Artifact[]> {
    if (ownerIds.length === 0) {
      return Promise.resolve([])
    }
    return this.db
      .select()
      .from(artifact)
      .where(and(eq(artifact.ownerType, ownerType), inArray(artifact.ownerId, ownerIds)))
      .orderBy(asc(artifact.createdAt))
  }

  create(input: NewTask): Promise<string> {
    return this.db.transaction(async (tx) => {
      const [target] = await tx
        .select({ defaultBranch: repository.defaultBranch })
        .from(application)
        .innerJoin(repository, eq(application.repositoryId, repository.id))
        .where(eq(application.id, input.applicationId))
      const [written] = await tx
        .insert(report)
        .values({
          applicationId: input.applicationId,
          source: ReportSource.Web,
          description: input.description,
          expectedBehaviour: input.expectedBehaviour,
          reporter: input.reporter,
        })
        .returning({ id: report.id })
      if (input.screenshotArtifactId !== null) {
        const claimed = await tx
          .update(artifact)
          .set({ ownerId: written.id })
          .where(and(eq(artifact.id, input.screenshotArtifactId), eq(artifact.ownerType, ArtifactOwner.Report), eq(artifact.ownerId, input.orgId)))
          .returning({ id: artifact.id })
        if (claimed.length === 0) {
          throw new ScreenshotNotFound(input.screenshotArtifactId)
        }
      }
      const [created] = await tx
        .insert(task)
        .values({
          applicationId: input.applicationId,
          reportId: written.id,
          kind: input.kind,
          targetBranch: input.targetBranch ?? target.defaultBranch,
          runLimit: input.runLimit,
        })
        .returning({ id: task.id })
      return created.id
    })
  }

  reply(taskId: string, body: string): Promise<TaskMessage> {
    return this.db.transaction(async (tx) => {
      const [current] = await tx.select({ phase: task.phase }).from(task).where(eq(task.id, taskId)).for('update')
      const [open] =
        current.phase === TaskPhase.NeedsInput
          ? await tx
            .select({ id: taskMessage.id })
            .from(taskMessage)
            .where(and(eq(taskMessage.taskId, taskId), eq(taskMessage.blocking, true), isNull(taskMessage.answeredAt)))
            .orderBy(desc(taskMessage.createdAt))
            .limit(1)
          : []
      const [written] = await tx
        .insert(taskMessage)
        .values({ taskId, role: MessageRole.User, body, repliesToId: open?.id ?? null })
        .returning()
      if (!open) {
        return written
      }
      await tx.update(taskMessage).set({ answeredAt: written.createdAt }).where(eq(taskMessage.id, open.id))
      const events = await tx.select().from(taskEvent).where(eq(taskEvent.taskId, taskId)).orderBy(asc(taskEvent.at), asc(taskEvent.id))
      const resumed = phaseAfterReply(current.phase, events)
      if (resumed === null) {
        return written
      }
      await tx.update(task).set({ phase: resumed }).where(eq(task.id, taskId))
      await tx.insert(taskEvent).values({ taskId, kind: TaskEventKind.PhaseChanged, payload: { from: current.phase, to: resumed } })
      return written
    })
  }

  private async rowsWhere(where: SQL | undefined): Promise<TaskListRow[]> {
    const base = await this.db
      .select({
        task,
        application: { id: application.id, name: application.name },
        report: { description: report.description, source: report.source },
      })
      .from(task)
      .innerJoin(application, eq(task.applicationId, application.id))
      .leftJoin(report, eq(task.reportId, report.id))
      .where(where)
    if (base.length === 0) {
      return []
    }
    const ids = base.map((row) => row.task.id)
    const [runs, questions, pulls] = await Promise.all([
      this.db
        .select({ taskId: run.taskId, number: max(run.number) })
        .from(run)
        .where(inArray(run.taskId, ids))
        .groupBy(run.taskId),
      this.db
        .select({ taskId: taskMessage.taskId, body: taskMessage.body })
        .from(taskMessage)
        .where(and(inArray(taskMessage.taskId, ids), eq(taskMessage.blocking, true), isNull(taskMessage.answeredAt)))
        .orderBy(desc(taskMessage.createdAt)),
      this.db
        .select({
          taskId: pullRequest.taskId,
          number: pullRequest.number,
          isDraft: pullRequest.isDraft,
          state: pullRequest.state,
          repositoryFullName: repository.fullName,
        })
        .from(pullRequest)
        .innerJoin(repository, eq(pullRequest.repositoryId, repository.id))
        .where(inArray(pullRequest.taskId, ids)),
    ])
    return base.map((row) => {
      const pull = pulls.find((candidate) => candidate.taskId === row.task.id)
      return {
        task: row.task,
        application: row.application,
        report: row.report,
        runNumber: runs.find((candidate) => candidate.taskId === row.task.id)?.number ?? null,
        blockingQuestion: questions.find((candidate) => candidate.taskId === row.task.id)?.body ?? null,
        pullRequest: pull
          ? { number: pull.number, isDraft: pull.isDraft, state: pull.state, repositoryFullName: pull.repositoryFullName }
          : null,
      }
    })
  }
}
