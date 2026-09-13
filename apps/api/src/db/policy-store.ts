import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import type { Policy, RoleBinding } from '../access/types'
import { DATABASE_CONNECTION, type Database } from './client'
import { policy, roleBinding } from './schema'

@Injectable()
export class PolicyStore {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  policiesFor(orgId: string): Promise<Policy[]> {
    return this.db
      .select({ orgId: policy.orgId, subject: policy.subject, resource: policy.resource, action: policy.action })
      .from(policy)
      .where(eq(policy.orgId, orgId))
  }

  bindingsFor(orgId: string, userId: string): Promise<RoleBinding[]> {
    return this.db
      .select({ orgId: roleBinding.orgId, userId: roleBinding.userId, subject: roleBinding.subject, scope: roleBinding.scope })
      .from(roleBinding)
      .where(and(eq(roleBinding.orgId, orgId), eq(roleBinding.userId, userId)))
  }
}
