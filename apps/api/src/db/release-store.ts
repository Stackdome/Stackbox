import { Inject, Injectable } from '@nestjs/common'
import { InstanceStatus, type ReleaseStatus } from '@stackbox/contract'
import { type SQL, and, desc, eq, inArray, notInArray } from 'drizzle-orm'
import type { NewRelease, ReleaseRecord } from '../instances/types'
import { IN_FLIGHT } from '../releases/calc/release-progress'
import { DATABASE_CONNECTION, type Database } from './client'
import { applicationInstance, release, run } from './schema'

const SETTLED_INSTANCE_STATUSES = [InstanceStatus.Expired, InstanceStatus.TornDown]

function toReleaseRecord({ release: row, runNumber }: { release: typeof release.$inferSelect; runNumber: number | null }): ReleaseRecord {
  return {
    id: row.id,
    instanceId: row.instanceId,
    commitSha: row.commitSha,
    ref: row.ref,
    status: row.status,
    runNumber,
    createdAt: row.createdAt,
  }
}

export async function selectReleases(db: Database, where: SQL | undefined): Promise<ReleaseRecord[]> {
  const rows = await db
    .select({ release, runNumber: run.number })
    .from(release)
    .leftJoin(run, eq(release.runId, run.id))
    .where(where)
    .orderBy(desc(release.createdAt), desc(release.id))
  return rows.map(toReleaseRecord)
}

@Injectable()
export class ReleaseStore {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async insert(row: NewRelease): Promise<ReleaseRecord> {
    const [stored] = await this.db.insert(release).values(row).returning()
    return {
      id: stored.id,
      instanceId: stored.instanceId,
      commitSha: stored.commitSha,
      ref: stored.ref,
      status: stored.status,
      runNumber: null,
      createdAt: stored.createdAt,
    }
  }

  async inFlight(): Promise<ReleaseRecord[]> {
    const rows = await this.db
      .select({ release, runNumber: run.number })
      .from(release)
      .leftJoin(run, eq(release.runId, run.id))
      .innerJoin(applicationInstance, eq(release.instanceId, applicationInstance.id))
      .where(and(inArray(release.status, IN_FLIGHT), notInArray(applicationInstance.status, SETTLED_INSTANCE_STATUSES)))
      .orderBy(desc(release.createdAt), desc(release.id))
    return rows.map(toReleaseRecord)
  }

  async setStatus(releaseId: string, status: ReleaseStatus): Promise<void> {
    await this.db.update(release).set({ status }).where(eq(release.id, releaseId))
  }
}
