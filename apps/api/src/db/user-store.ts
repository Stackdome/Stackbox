import { Inject, Injectable } from '@nestjs/common'
import { UserRole } from '@stackbox/contract'
import { type SQL, and, asc, eq, inArray, sql } from 'drizzle-orm'
import { ORG_SCOPE } from '../access/types'
import { removalRefusal, roleChangeRefusal } from '../organizations/calc/membership'
import { MemberOutcomeKind, type RemovalOutcome, type RoleChangeOutcome, type UserAccount, type UserProfile } from '../organizations/types'
import { DATABASE_CONNECTION, type Database } from './client'
import { organization, roleBinding, userAccount } from './schema'

const ORGANIZATION_ROLES = Object.values(UserRole)

function emailIs(email: string): SQL {
  return sql`lower(${userAccount.email}) = ${email.trim().toLowerCase()}`
}

@Injectable()
export class UserStore {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async findByEmail(email: string): Promise<UserProfile | null> {
    const [first] = await this.listByEmail(email)
    return first ?? null
  }

  listByEmail(email: string): Promise<UserProfile[]> {
    return this.profilesWhere(emailIs(email))
  }

  async findById(id: string): Promise<UserProfile | null> {
    const [profile] = await this.profilesWhere(eq(userAccount.id, id))
    return profile ?? null
  }

  members(orgId: string): Promise<UserAccount[]> {
    return this.db
      .select()
      .from(userAccount)
      .where(eq(userAccount.orgId, orgId))
      .orderBy(asc(sql`coalesce(${userAccount.name}, ${userAccount.email})`), asc(userAccount.email))
  }

  async isMember(orgId: string, email: string): Promise<boolean> {
    const [row] = await this.db.select({ id: userAccount.id }).from(userAccount).where(and(eq(userAccount.orgId, orgId), emailIs(email))).limit(1)
    return row !== undefined
  }

  async bumpTokenVersion(userId: string): Promise<void> {
    await this.db
      .update(userAccount)
      .set({ tokenVersion: sql`${userAccount.tokenVersion} + 1` })
      .where(eq(userAccount.id, userId))
  }

  // The organization's accounts stay locked from the refusal check to the write, so two admins cannot demote each other to none.
  changeRole(change: { orgId: string; callerId: string; userId: string; role: UserRole }): Promise<RoleChangeOutcome> {
    return this.db.transaction(async (tx): Promise<RoleChangeOutcome> => {
      const members = await tx.select({ id: userAccount.id, orgRole: userAccount.orgRole }).from(userAccount).where(eq(userAccount.orgId, change.orgId)).for('update')
      const target = members.find((member) => member.id === change.userId)
      if (!target) return { kind: MemberOutcomeKind.Missing }
      const refusal = roleChangeRefusal({ callerId: change.callerId, target, role: change.role, members })
      if (refusal) return { kind: MemberOutcomeKind.Refused, refusal }
      const [member] = await tx
        .update(userAccount)
        .set({ orgRole: change.role, tokenVersion: sql`${userAccount.tokenVersion} + 1` })
        .where(eq(userAccount.id, target.id))
        .returning()
      await tx
        .delete(roleBinding)
        .where(and(eq(roleBinding.userId, target.id), eq(roleBinding.scope, ORG_SCOPE), inArray(roleBinding.subject, ORGANIZATION_ROLES)))
      await tx.insert(roleBinding).values({ orgId: change.orgId, userId: target.id, subject: change.role, scope: ORG_SCOPE })
      return { kind: MemberOutcomeKind.Changed, member }
    })
  }

  remove(removal: { orgId: string; callerId: string; userId: string }): Promise<RemovalOutcome> {
    return this.db.transaction(async (tx): Promise<RemovalOutcome> => {
      const members = await tx.select({ id: userAccount.id, orgRole: userAccount.orgRole }).from(userAccount).where(eq(userAccount.orgId, removal.orgId)).for('update')
      const target = members.find((member) => member.id === removal.userId)
      if (!target) return { kind: MemberOutcomeKind.Missing }
      const refusal = removalRefusal({ callerId: removal.callerId, target, members })
      if (refusal) return { kind: MemberOutcomeKind.Refused, refusal }
      await tx.delete(userAccount).where(eq(userAccount.id, target.id))
      return { kind: MemberOutcomeKind.Removed }
    })
  }

  private async profilesWhere(where: SQL): Promise<UserProfile[]> {
    const rows = await this.db
      .select({ user: userAccount, organizationName: organization.name })
      .from(userAccount)
      .innerJoin(organization, eq(userAccount.orgId, organization.id))
      .where(where)
      .orderBy(asc(organization.name))
    return rows.map((row) => ({ ...row.user, organizationName: row.organizationName }))
  }
}
