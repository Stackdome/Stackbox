import { Inject, Injectable } from '@nestjs/common'
import { InstancePurpose, InstanceStatus, type TaskPhase } from '@stackbox/contract'
import { and, asc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import { DEFAULT_EXPIRY_HOURS } from '../instances/calc/expiry'
import type { Lease } from '../reconciler/calc/lease'
import { type ExecutionPatch, PhaseConflict, type TaskSnapshot, type TaskState } from '../reconciler/task-state'
import type { Artifact, Execution, PullRequest, Release, Run, Sandbox, Task, TaskCheck, TaskEvent } from '../tasks/types'
import { DATABASE_CONNECTION, type Database } from './client'
import {
  application,
  applicationInstance,
  artifact,
  execution,
  gitConnection,
  organization,
  pullRequest,
  release,
  report,
  repository,
  run,
  sandbox,
  task,
  taskCheck,
  taskEvent,
  taskMessage,
} from './schema'

@Injectable()
export class DrizzleTaskState implements TaskState {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  claim(lease: Lease, now: Date, limit: number): Promise<Task[]> {
    // completed_at is null on every non-terminal task and on a terminal task still owed its cleanup.
    const claimable = this.db
      .select({ id: task.id })
      .from(task)
      .where(and(isNull(task.completedAt), or(isNull(task.leaseExpiresAt), lte(task.leaseExpiresAt, now))))
      .orderBy(asc(task.createdAt))
      .limit(limit)
      .for('update', { skipLocked: true })
    return this.db
      .update(task)
      .set({ leaseOwner: lease.owner, leaseExpiresAt: lease.expiresAt })
      .where(inArray(task.id, claimable))
      .returning()
  }

  async load(taskId: string): Promise<TaskSnapshot> {
    const [head] = await this.db
      .select({ task, report, repository, organization, connection: gitConnection })
      .from(task)
      .innerJoin(application, eq(task.applicationId, application.id))
      .innerJoin(organization, eq(application.orgId, organization.id))
      .innerJoin(repository, eq(application.repositoryId, repository.id))
      .innerJoin(gitConnection, eq(repository.connectionId, gitConnection.id))
      .innerJoin(report, eq(task.reportId, report.id))
      .where(eq(task.id, taskId))
    if (!head) throw new Error(`task ${taskId} does not exist or has no report`)
    const { instanceId } = head.task
    const [runs, releases, sandboxes, executions, checks, pullRequests, messages, events] = await Promise.all([
      this.db.select().from(run).where(eq(run.taskId, taskId)).orderBy(asc(run.number)),
      instanceId === null
        ? Promise.resolve([] as Release[])
        : this.db.select().from(release).where(eq(release.instanceId, instanceId)).orderBy(asc(release.createdAt)),
      this.db.select().from(sandbox).where(eq(sandbox.taskId, taskId)).orderBy(asc(sandbox.createdAt)),
      this.db.select().from(execution).where(eq(execution.taskId, taskId)).orderBy(asc(execution.startedAt)),
      this.db.select().from(taskCheck).where(eq(taskCheck.taskId, taskId)).orderBy(asc(taskCheck.ranAt)),
      this.db.select().from(pullRequest).where(eq(pullRequest.taskId, taskId)),
      this.db.select().from(taskMessage).where(eq(taskMessage.taskId, taskId)).orderBy(asc(taskMessage.createdAt)),
      this.db.select().from(taskEvent).where(eq(taskEvent.taskId, taskId)).orderBy(asc(taskEvent.at), asc(taskEvent.id)),
    ])
    return {
      organization: head.organization,
      repository: head.repository,
      connection: head.connection,
      report: head.report,
      task: head.task,
      runs,
      releases,
      sandboxes,
      executions,
      checks,
      pullRequest: pullRequests[0] ?? null,
      messages,
      events,
    }
  }

  async saveTask(next: Task, expectedPhase: TaskPhase): Promise<void> {
    await this.db.transaction(async (tx) => {
      if (next.instanceId !== null) {
        // onConflictDoNothing: a row the instances module already owns must not be overwritten here.
        await tx
          .insert(applicationInstance)
          .values({
            id: next.instanceId,
            applicationId: next.applicationId,
            purpose: InstancePurpose.Task,
            taskId: next.id,
            // now() is the transaction's start, the same instant created_at defaults to.
            expiresAt: sql`now() + ${`${DEFAULT_EXPIRY_HOURS} hours`}::interval`,
          })
          .onConflictDoNothing({ target: applicationInstance.id })
      }
      const saved = await tx
        .update(task)
        .set({
          instanceId: next.instanceId,
          originReleaseId: next.originReleaseId,
          phase: next.phase,
          resolution: next.resolution,
          costCents: next.costCents,
          completedAt: next.completedAt,
        })
        .where(and(eq(task.id, next.id), eq(task.phase, expectedPhase)))
        .returning({ id: task.id })
      if (saved.length > 0) return
      const [stored] = await tx.select({ phase: task.phase }).from(task).where(eq(task.id, next.id))
      throw new PhaseConflict(next.id, expectedPhase, stored.phase)
    })
  }

  async saveRun(next: Run): Promise<void> {
    const updated = await this.db
      .update(run)
      .set({ candidateSha: next.candidateSha, verifiedSha: next.verifiedSha, outcome: next.outcome, endedAt: next.endedAt })
      .where(eq(run.id, next.id))
      .returning({ id: run.id })
    if (updated.length > 0) return
    await this.db.insert(run).values(next).onConflictDoNothing({ target: [run.taskId, run.number] })
  }

  async saveRelease(next: Release): Promise<void> {
    await this.db.insert(release).values(next).onConflictDoUpdate({ target: release.id, set: { status: next.status } })
  }

  async markInstanceTornDown(instanceId: string): Promise<void> {
    await this.db.update(applicationInstance).set({ status: InstanceStatus.TornDown }).where(eq(applicationInstance.id, instanceId))
  }

  async saveSandbox(next: Sandbox): Promise<void> {
    await this.db
      .insert(sandbox)
      .values(next)
      .onConflictDoUpdate({ target: sandbox.id, set: { externalId: next.externalId, status: next.status, stoppedAt: next.stoppedAt } })
  }

  async insertExecution(next: Execution): Promise<Execution> {
    const [inserted] = await this.db.insert(execution).values(next).onConflictDoNothing({ target: execution.idempotencyKey }).returning()
    if (inserted) return inserted
    const [stored] = await this.db.select().from(execution).where(eq(execution.idempotencyKey, next.idempotencyKey))
    return stored
  }

  async updateExecution(executionId: string, patch: ExecutionPatch): Promise<void> {
    await this.db.update(execution).set(patch).where(eq(execution.id, executionId))
  }

  async appendCheck(check: TaskCheck): Promise<void> {
    await this.db.insert(taskCheck).values(check)
  }

  async appendArtifact(next: Artifact): Promise<void> {
    await this.db.insert(artifact).values(next)
  }

  async appendEvent(event: TaskEvent): Promise<void> {
    await this.db.insert(taskEvent).values(event)
  }

  async savePullRequest(next: PullRequest): Promise<void> {
    await this.db
      .insert(pullRequest)
      .values(next)
      .onConflictDoUpdate({ target: pullRequest.id, set: { state: next.state, isDraft: next.isDraft } })
  }

  async releaseLease(taskId: string, owner: string): Promise<void> {
    await this.db
      .update(task)
      .set({ leaseOwner: null, leaseExpiresAt: null })
      .where(and(eq(task.id, taskId), eq(task.leaseOwner, owner)))
  }
}
