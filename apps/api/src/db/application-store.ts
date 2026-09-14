import { Inject, Injectable } from '@nestjs/common'
import { InstanceStatus, TaskPhase } from '@stackbox/contract'
import { and, asc, count, eq, inArray, notInArray, or } from 'drizzle-orm'
import { type ApplicationPatch, type ApplicationRecord, type NewApplication, RemoveOutcome, type ServiceRecord, type SyncWrite } from '../applications/types'
import type { ApplicationRef } from '../repositories/types'
import { isTerminal } from '../tasks/calc/phase-transitions'
import { DATABASE_CONNECTION, type Database } from './client'
import { application, applicationInstance, artifact, gitConnection, pullRequest, report, repository, service, task, taskCheck, taskMessage } from './schema'

const TERMINAL_PHASES = Object.values(TaskPhase).filter(isTerminal)

type HeadRow = {
  application: typeof application.$inferSelect
  repository: typeof repository.$inferSelect
  installationRef: string
}

@Injectable()
export class ApplicationStore {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  listByOrg(orgId: string): Promise<ApplicationRef[]> {
    return this.db
      .select({ id: application.id, name: application.name })
      .from(application)
      .where(eq(application.orgId, orgId))
      .orderBy(asc(application.name))
  }

  async existsInOrg(orgId: string, applicationId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: application.id })
      .from(application)
      .where(and(eq(application.orgId, orgId), eq(application.id, applicationId)))
    return rows.length > 0
  }

  async listRecords(orgId: string): Promise<ApplicationRecord[]> {
    const heads = await this.db
      .select({ application, repository, installationRef: gitConnection.installationRef })
      .from(application)
      .innerJoin(repository, eq(application.repositoryId, repository.id))
      .innerJoin(gitConnection, eq(repository.connectionId, gitConnection.id))
      .where(eq(application.orgId, orgId))
      .orderBy(asc(application.name))
    return this.recordsOf(heads)
  }

  async findRecord(orgId: string, applicationId: string): Promise<ApplicationRecord | null> {
    const heads = await this.db
      .select({ application, repository, installationRef: gitConnection.installationRef })
      .from(application)
      .innerJoin(repository, eq(application.repositoryId, repository.id))
      .innerJoin(gitConnection, eq(repository.connectionId, gitConnection.id))
      .where(and(eq(application.orgId, orgId), eq(application.id, applicationId)))
    const [record] = await this.recordsOf(heads)
    return record ?? null
  }

  async servicesOf(applicationId: string): Promise<ServiceRecord[]> {
    const rows = await this.db
      .select({ service, repository })
      .from(service)
      .leftJoin(repository, eq(service.repositoryId, repository.id))
      .where(eq(service.applicationId, applicationId))
      .orderBy(asc(service.name))
    return rows.map((row) => ({
      id: row.service.id,
      name: row.service.name,
      path: row.service.path,
      image: row.service.image,
      repository: row.repository && { id: row.repository.id, fullName: row.repository.fullName, defaultBranch: row.repository.defaultBranch },
    }))
  }

  async create(input: NewApplication): Promise<string | null> {
    const [row] = await this.db
      .insert(application)
      .values(input)
      .onConflictDoNothing({ target: [application.orgId, application.slug] })
      .returning({ id: application.id })
    return row?.id ?? null
  }

  async update(applicationId: string, patch: ApplicationPatch): Promise<void> {
    // Drizzle refuses an update with nothing to set.
    if (Object.keys(patch).length === 0) return
    await this.db.update(application).set(patch).where(eq(application.id, applicationId))
  }

  async recordSync(applicationId: string, repositoryId: string, write: SyncWrite): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.select({ id: application.id }).from(application).where(eq(application.id, applicationId)).for('update')
      if ('error' in write) {
        await tx.update(application).set({ validationError: write.error }).where(eq(application.id, applicationId))
        return
      }
      await tx.delete(service).where(eq(service.applicationId, applicationId))
      await tx.insert(service).values(
        write.services.map((detected) => ({
          applicationId,
          name: detected.name,
          path: detected.path,
          image: detected.image,
          repositoryId: detected.path === null ? null : repositoryId,
        })),
      )
      await tx
        .update(application)
        .set({ syncedAtSha: write.sha, validatedAt: write.validatedAt, validationError: null })
        .where(eq(application.id, applicationId))
    })
  }

  async removeIfIdle(applicationId: string): Promise<RemoveOutcome> {
    return this.db.transaction(async (tx) => {
      await tx.select({ id: application.id }).from(application).where(eq(application.id, applicationId)).for('update')
      const [active] = await tx
        .select({ id: task.id })
        .from(task)
        .where(and(eq(task.applicationId, applicationId), notInArray(task.phase, TERMINAL_PHASES)))
        .limit(1)
      if (active) return RemoveOutcome.ActiveTasks
      const [live] = await tx
        .select({ id: applicationInstance.id })
        .from(applicationInstance)
        .where(and(eq(applicationInstance.applicationId, applicationId), notInArray(applicationInstance.status, [InstanceStatus.Expired, InstanceStatus.TornDown])))
        .limit(1)
      if (live) return RemoveOutcome.LiveInstances
      const tasks = tx.select({ id: task.id }).from(task).where(eq(task.applicationId, applicationId))
      const reports = tx.select({ id: report.id }).from(report).where(eq(report.applicationId, applicationId))
      const checks = tx.select({ id: taskCheck.id }).from(taskCheck).where(inArray(taskCheck.taskId, tasks))
      const messages = tx.select({ id: taskMessage.id }).from(taskMessage).where(inArray(taskMessage.taskId, tasks))
      // pull_request does not cascade from task, and artifact.owner_id has no foreign key, so both go first.
      await tx.delete(pullRequest).where(inArray(pullRequest.taskId, tasks))
      await tx.delete(artifact).where(or(inArray(artifact.ownerId, reports), inArray(artifact.ownerId, checks), inArray(artifact.ownerId, messages)))
      await tx.delete(application).where(eq(application.id, applicationId))
      return RemoveOutcome.Removed
    })
  }

  private async recordsOf(heads: HeadRow[]): Promise<ApplicationRecord[]> {
    const ids = heads.map((head) => head.application.id)
    if (ids.length === 0) return []
    const [names, counts] = await Promise.all([
      this.db
        .select({ applicationId: service.applicationId, name: service.name })
        .from(service)
        .where(inArray(service.applicationId, ids))
        .orderBy(asc(service.name)),
      this.db
        .select({ applicationId: task.applicationId, tasks: count() })
        .from(task)
        .where(inArray(task.applicationId, ids))
        .groupBy(task.applicationId),
    ])
    return heads.map(({ application: row, repository: repo, installationRef }) => ({
      id: row.id,
      orgId: row.orgId,
      name: row.name,
      slug: row.slug,
      stackfilePath: row.stackfilePath,
      syncedAtSha: row.syncedAtSha,
      validatedAt: row.validatedAt,
      validationError: row.validationError,
      credentialsRef: row.credentialsRef,
      createdAt: row.createdAt,
      repository: { id: repo.id, fullName: repo.fullName, defaultBranch: repo.defaultBranch, externalId: repo.externalId, installationRef },
      serviceNames: names.filter((entry) => entry.applicationId === row.id).map((entry) => entry.name),
      taskCount: counts.find((entry) => entry.applicationId === row.id)?.tasks ?? 0,
    }))
  }
}
