import { Inject, Injectable } from '@nestjs/common'
import type { ReleaseStatus } from '@stackbox/contract'
import { type SQL, desc, eq, inArray } from 'drizzle-orm'
import type { NewRelease, ReleaseRecord } from '../instances/types'
import { IN_FLIGHT } from '../releases/calc/release-progress'
import { DATABASE_CONNECTION, type Database } from './client'
import { release, run } from './schema'

export async function selectReleases(db: Database, where: SQL | undefined): Promise<ReleaseRecord[]> {
  const rows = await db
    .select({ release, runNumber: run.number })
    .from(release)
    .leftJoin(run, eq(release.runId, run.id))
    .where(where)
    .orderBy(desc(release.createdAt), desc(release.id))
  return rows.map(({ release: row, runNumber }) => ({
    id: row.id,
    instanceId: row.instanceId,
    commitSha: row.commitSha,
    ref: row.ref,
    status: row.status,
    runNumber,
    createdAt: row.createdAt,
  }))
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

  inFlight(): Promise<ReleaseRecord[]> {
    return selectReleases(this.db, inArray(release.status, IN_FLIGHT))
  }

  async setStatus(releaseId: string, status: ReleaseStatus): Promise<void> {
    await this.db.update(release).set({ status }).where(eq(release.id, releaseId))
  }
}
