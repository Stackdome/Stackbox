import { Inject, Injectable } from '@nestjs/common'
import type { ConnectionStatus, RepoProvider } from '@stackbox/contract'
import { and, asc, count, eq, getTableColumns } from 'drizzle-orm'
import type { ConnectionView, NewConnection } from '../repositories/types'
import { DATABASE_CONNECTION, type Database } from './client'
import { gitConnection, repository } from './schema'

@Injectable()
export class GitConnectionStore {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  listByOrg(orgId: string): Promise<ConnectionView[]> {
    return this.db
      .select({ ...getTableColumns(gitConnection), repositoryCount: count(repository.id) })
      .from(gitConnection)
      .leftJoin(repository, eq(repository.connectionId, gitConnection.id))
      .where(eq(gitConnection.orgId, orgId))
      .groupBy(gitConnection.id)
      .orderBy(asc(gitConnection.createdAt))
  }

  async findInOrg(orgId: string, connectionId: string): Promise<ConnectionView | null> {
    const [row] = await this.db
      .select({ ...getTableColumns(gitConnection), repositoryCount: count(repository.id) })
      .from(gitConnection)
      .leftJoin(repository, eq(repository.connectionId, gitConnection.id))
      .where(and(eq(gitConnection.orgId, orgId), eq(gitConnection.id, connectionId)))
      .groupBy(gitConnection.id)
    return row ?? null
  }

  async exists(orgId: string, provider: RepoProvider, installationRef: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: gitConnection.id })
      .from(gitConnection)
      .where(and(eq(gitConnection.orgId, orgId), eq(gitConnection.provider, provider), eq(gitConnection.installationRef, installationRef)))
    return rows.length > 0
  }

  async create(input: NewConnection): Promise<string> {
    const [row] = await this.db
      .insert(gitConnection)
      .values({ orgId: input.orgId, provider: input.provider, installationRef: input.login, accountLogin: input.login })
      .returning({ id: gitConnection.id })
    return row.id
  }

  async setStatus(connectionId: string, status: ConnectionStatus): Promise<void> {
    await this.db.update(gitConnection).set({ status }).where(eq(gitConnection.id, connectionId))
  }
}
