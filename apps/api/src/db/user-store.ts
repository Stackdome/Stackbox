import { Inject, Injectable } from '@nestjs/common'
import { eq, type SQL } from 'drizzle-orm'
import type { UserProfile } from '../organizations/types'
import { DATABASE_CONNECTION, type Database } from './client'
import { organization, userAccount } from './schema'

@Injectable()
export class UserStore {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  findByEmail(email: string): Promise<UserProfile | null> {
    return this.findWhere(eq(userAccount.email, email))
  }

  findById(id: string): Promise<UserProfile | null> {
    return this.findWhere(eq(userAccount.id, id))
  }

  private async findWhere(where: SQL): Promise<UserProfile | null> {
    const [row] = await this.db
      .select({ user: userAccount, organizationName: organization.name })
      .from(userAccount)
      .innerJoin(organization, eq(userAccount.orgId, organization.id))
      .where(where)
      .limit(1)
    return row ? { ...row.user, organizationName: row.organizationName } : null
  }
}
