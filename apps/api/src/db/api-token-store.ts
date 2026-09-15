import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import type { ApiTokenRecord, NewApiToken } from '../auth/types'
import { DATABASE_CONNECTION, type Database } from './client'
import { apiToken } from './schema'

const TOKEN_COLUMNS = {
  id: apiToken.id,
  userId: apiToken.userId,
  orgId: apiToken.orgId,
  name: apiToken.name,
  prefix: apiToken.prefix,
  expiresAt: apiToken.expiresAt,
  lastUsedAt: apiToken.lastUsedAt,
  revokedAt: apiToken.revokedAt,
  createdAt: apiToken.createdAt,
}

@Injectable()
export class ApiTokenStore {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  listFor(userId: string): Promise<ApiTokenRecord[]> {
    return this.db
      .select(TOKEN_COLUMNS)
      .from(apiToken)
      .where(and(eq(apiToken.userId, userId), isNull(apiToken.revokedAt)))
      .orderBy(desc(apiToken.createdAt), desc(apiToken.id))
  }

  async insert(row: NewApiToken): Promise<ApiTokenRecord> {
    const [stored] = await this.db.insert(apiToken).values(row).returning(TOKEN_COLUMNS)
    return stored
  }

  async revoke(userId: string, tokenId: string, at: Date): Promise<boolean> {
    const rows = await this.db
      .update(apiToken)
      .set({ revokedAt: sql`coalesce(${apiToken.revokedAt}, ${at})` })
      .where(and(eq(apiToken.id, tokenId), eq(apiToken.userId, userId)))
      .returning({ id: apiToken.id })
    return rows.length > 0
  }

  async findByHash(tokenHash: string): Promise<ApiTokenRecord | null> {
    const [row] = await this.db.select(TOKEN_COLUMNS).from(apiToken).where(eq(apiToken.tokenHash, tokenHash))
    return row ?? null
  }

  async touch(tokenId: string, at: Date): Promise<void> {
    await this.db.update(apiToken).set({ lastUsedAt: at }).where(eq(apiToken.id, tokenId))
  }
}
