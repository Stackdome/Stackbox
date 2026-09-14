import { Inject, Injectable } from '@nestjs/common'
import { InstanceStatus } from '@stackbox/contract'
import { type SQL, and, desc, eq, inArray, ne, notInArray } from 'drizzle-orm'
import type { InstanceRecord, NewInstance } from '../instances/types'
import { DATABASE_CONNECTION, type Database } from './client'
import { selectReleases } from './release-store'
import { application, applicationInstance, gitConnection, release, report, repository, task, userAccount } from './schema'

export type InstanceListFilter = { applicationId?: string; includeTornDown: boolean }

@Injectable()
export class InstanceStore {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  list(orgId: string, filter: InstanceListFilter): Promise<InstanceRecord[]> {
    return this.recordsWhere(
      and(
        eq(application.orgId, orgId),
        filter.applicationId === undefined ? undefined : eq(applicationInstance.applicationId, filter.applicationId),
        filter.includeTornDown ? undefined : ne(applicationInstance.status, InstanceStatus.TornDown),
      ),
    )
  }

  async find(orgId: string, instanceId: string): Promise<InstanceRecord | null> {
    const [record] = await this.recordsWhere(and(eq(application.orgId, orgId), eq(applicationInstance.id, instanceId)))
    return record ?? null
  }

  live(): Promise<InstanceRecord[]> {
    return this.recordsWhere(notInArray(applicationInstance.status, [InstanceStatus.Expired, InstanceStatus.TornDown]))
  }

  async insert(row: NewInstance): Promise<void> {
    await this.db.insert(applicationInstance).values(row)
  }

  async setStatus(instanceId: string, status: InstanceStatus, from?: InstanceStatus): Promise<void> {
    await this.db
      .update(applicationInstance)
      .set({ status })
      .where(and(eq(applicationInstance.id, instanceId), ne(applicationInstance.status, InstanceStatus.TornDown), from === undefined ? undefined : eq(applicationInstance.status, from)))
  }

  async setUrl(instanceId: string, url: string): Promise<void> {
    await this.db.update(applicationInstance).set({ url }).where(eq(applicationInstance.id, instanceId))
  }

  async setExpiry(instanceId: string, expiresAt: Date): Promise<void> {
    await this.db.update(applicationInstance).set({ expiresAt }).where(eq(applicationInstance.id, instanceId))
  }

  private async recordsWhere(where: SQL | undefined): Promise<InstanceRecord[]> {
    const rows = await this.db
      .select({
        instance: applicationInstance,
        orgId: application.orgId,
        application: { id: application.id, name: application.name },
        repository,
        installationRef: gitConnection.installationRef,
        owner: { id: userAccount.id, name: userAccount.name, email: userAccount.email },
        task: { id: task.id, phase: task.phase },
        description: report.description,
      })
      .from(applicationInstance)
      .innerJoin(application, eq(applicationInstance.applicationId, application.id))
      .innerJoin(repository, eq(application.repositoryId, repository.id))
      .innerJoin(gitConnection, eq(repository.connectionId, gitConnection.id))
      .leftJoin(userAccount, eq(applicationInstance.createdBy, userAccount.id))
      .leftJoin(task, eq(applicationInstance.taskId, task.id))
      .leftJoin(report, eq(task.reportId, report.id))
      .where(where)
      .orderBy(desc(applicationInstance.createdAt), desc(applicationInstance.id))
    if (rows.length === 0) return []
    const releases = await selectReleases(this.db, inArray(release.instanceId, rows.map((row) => row.instance.id)))
    return rows.map((row) => ({
      id: row.instance.id,
      orgId: row.orgId,
      application: row.application,
      repository: {
        id: row.repository.id,
        fullName: row.repository.fullName,
        defaultBranch: row.repository.defaultBranch,
        externalId: row.repository.externalId,
        installationRef: row.installationRef,
      },
      purpose: row.instance.purpose,
      status: row.instance.status,
      url: row.instance.url,
      owner: row.owner && { id: row.owner.id, name: row.owner.name ?? row.owner.email },
      task: row.task && { id: row.task.id, description: row.description ?? '', phase: row.task.phase },
      expiresAt: row.instance.expiresAt,
      createdAt: row.instance.createdAt,
      releases: releases.filter((entry) => entry.instanceId === row.instance.id),
    }))
  }
}
