import { Inject, Injectable } from '@nestjs/common'
import { type SQL, and, asc, eq } from 'drizzle-orm'
import type { RepoSummary } from '../ports'
import type { ProviderRepository, RepositoryWithUsage } from '../repositories/types'
import type { GitConnection, Repository } from '../tasks/types'
import { DATABASE_CONNECTION, type Database } from './client'
import { application, gitConnection, repository } from './schema'

type Usage = { repositoryId: string; id: string; name: string }

function withUsage(row: Repository, usage: Usage[]): RepositoryWithUsage {
  return { ...row, usedBy: usage.filter((use) => use.repositoryId === row.id).map(({ id, name }) => ({ id, name })) }
}

@Injectable()
export class RepositoryStore {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async listByOrg(orgId: string): Promise<RepositoryWithUsage[]> {
    const [rows, usage] = await Promise.all([
      this.db.select().from(repository).where(eq(repository.orgId, orgId)).orderBy(asc(repository.fullName)),
      this.usageWhere(eq(application.orgId, orgId)),
    ])
    return rows.map((row) => withUsage(row, usage))
  }

  async findInOrg(orgId: string, repositoryId: string): Promise<RepositoryWithUsage | null> {
    const [row] = await this.db
      .select()
      .from(repository)
      .where(and(eq(repository.orgId, orgId), eq(repository.id, repositoryId)))
    return row ? withUsage(row, await this.usageWhere(eq(application.repositoryId, row.id))) : null
  }

  async locate(orgId: string, repositoryId: string): Promise<ProviderRepository | null> {
    const [row] = await this.db
      .select({
        id: repository.id,
        fullName: repository.fullName,
        defaultBranch: repository.defaultBranch,
        externalId: repository.externalId,
        installationRef: gitConnection.installationRef,
      })
      .from(repository)
      .innerJoin(gitConnection, eq(repository.connectionId, gitConnection.id))
      .where(and(eq(repository.orgId, orgId), eq(repository.id, repositoryId)))
    return row ?? null
  }

  addMany(orgId: string, connection: GitConnection, summaries: RepoSummary[]): Promise<Repository[]> {
    return this.db
      .insert(repository)
      .values(
        summaries.map((summary) => ({
          orgId,
          connectionId: connection.id,
          provider: connection.provider,
          externalId: summary.externalId,
          fullName: summary.fullName,
          defaultBranch: summary.defaultBranch,
        })),
      )
      .onConflictDoNothing()
      .returning()
  }

  async remove(repositoryId: string): Promise<void> {
    await this.db.delete(repository).where(eq(repository.id, repositoryId))
  }

  private usageWhere(condition: SQL): Promise<Usage[]> {
    return this.db
      .select({ repositoryId: application.repositoryId, id: application.id, name: application.name })
      .from(application)
      .where(condition)
      .orderBy(asc(application.name))
  }
}
