import { Inject, Injectable } from '@nestjs/common'
import { ArtifactOwner, type ArtifactKind } from '@stackbox/contract'
import { and, eq, inArray, or } from 'drizzle-orm'
import type { Artifact } from '../tasks/types'
import { DATABASE_CONNECTION, type Database } from './client'
import { application, artifact, report, task, taskCheck, taskMessage } from './schema'

@Injectable()
export class ArtifactStore {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async createUnattached(orgId: string, image: { kind: ArtifactKind; url: string; meta: Record<string, unknown> }): Promise<Artifact> {
    // owner_id has no foreign key: an upload is owned by its organization id until POST /tasks claims it for the new report.
    const [row] = await this.db.insert(artifact).values({ ownerType: ArtifactOwner.Report, ownerId: orgId, ...image }).returning()
    return row
  }

  async findInOrg(orgId: string, artifactId: string): Promise<Artifact | null> {
    const inOrg = eq(application.orgId, orgId)
    const reports = this.db.select({ id: report.id }).from(report).innerJoin(application, eq(report.applicationId, application.id)).where(inOrg)
    const checks = this.db
      .select({ id: taskCheck.id })
      .from(taskCheck)
      .innerJoin(task, eq(taskCheck.taskId, task.id))
      .innerJoin(application, eq(task.applicationId, application.id))
      .where(inOrg)
    const messages = this.db
      .select({ id: taskMessage.id })
      .from(taskMessage)
      .innerJoin(task, eq(taskMessage.taskId, task.id))
      .innerJoin(application, eq(task.applicationId, application.id))
      .where(inOrg)
    const [row] = await this.db
      .select()
      .from(artifact)
      .where(
        and(
          eq(artifact.id, artifactId),
          or(
            and(eq(artifact.ownerType, ArtifactOwner.Report), or(eq(artifact.ownerId, orgId), inArray(artifact.ownerId, reports))),
            and(eq(artifact.ownerType, ArtifactOwner.TaskCheck), inArray(artifact.ownerId, checks)),
            and(eq(artifact.ownerType, ArtifactOwner.TaskMessage), inArray(artifact.ownerId, messages)),
          ),
        ),
      )
    return row ?? null
  }
}
