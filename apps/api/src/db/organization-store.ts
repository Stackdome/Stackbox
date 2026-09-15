import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import type { OrganizationChanges, OrganizationRecord } from '../organizations/types'
import { DATABASE_CONNECTION, type Database } from './client'
import { organization } from './schema'

@Injectable()
export class OrganizationStore {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async find(orgId: string): Promise<OrganizationRecord | null> {
    const [row] = await this.db.select().from(organization).where(eq(organization.id, orgId))
    return row ?? null
  }

  async update(orgId: string, changes: OrganizationChanges): Promise<OrganizationRecord | null> {
    // Drizzle refuses an update with nothing to set.
    if (changes.name === undefined && changes.budgetCents === undefined) return this.find(orgId)
    const [row] = await this.db.update(organization).set(changes).where(eq(organization.id, orgId)).returning()
    return row ?? null
  }
}
