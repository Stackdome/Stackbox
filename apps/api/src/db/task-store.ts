import { Inject, Injectable } from '@nestjs/common'
import { TaskPhase } from '@stackbox/contract'
import { and, desc, eq, inArray, isNull, max, type SQL } from 'drizzle-orm'
import { isTerminal } from '../tasks/calc/phase-transitions'
import { TaskEventKind, type TaskListRow } from '../tasks/types'
import { DATABASE_CONNECTION, type Database } from './client'
import { application, pullRequest, report, repository, run, task, taskEvent, taskMessage } from './schema'

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
