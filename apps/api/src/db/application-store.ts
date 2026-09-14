import { Inject, Injectable } from '@nestjs/common'
import { and, asc, eq } from 'drizzle-orm'
import type { ApplicationRef } from '../organizations/types'
import { DATABASE_CONNECTION, type Database } from './client'
import { application } from './schema'

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
}
