import { Inject, Injectable } from '@nestjs/common'
import { InviteStatus } from '@stackbox/contract'
import { and, desc, eq } from 'drizzle-orm'
import { ORG_SCOPE } from '../access/types'
import { isAcceptable } from '../organizations/calc/invite-status'
import { type AcceptOutcome, AcceptOutcomeKind, type InvitePreviewRecord, type InviteRecord, type NewInvite } from '../organizations/types'
import { DATABASE_CONNECTION, type Database } from './client'
import { invite, organization, roleBinding, userAccount } from './schema'

const INVITE_COLUMNS = {
  id: invite.id,
  orgId: invite.orgId,
  email: invite.email,
  role: invite.role,
  status: invite.status,
  expiresAt: invite.expiresAt,
  acceptedAt: invite.acceptedAt,
  createdAt: invite.createdAt,
}

@Injectable()
export class InviteStore {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  list(orgId: string): Promise<InviteRecord[]> {
    return this.db.select(INVITE_COLUMNS).from(invite).where(eq(invite.orgId, orgId)).orderBy(desc(invite.createdAt), desc(invite.id))
  }

  pendingFor(orgId: string, email: string): Promise<InviteRecord[]> {
    return this.db
      .select(INVITE_COLUMNS)
      .from(invite)
      .where(and(eq(invite.orgId, orgId), eq(invite.email, email), eq(invite.status, InviteStatus.Pending)))
  }

  async insert(row: NewInvite): Promise<InviteRecord> {
    const [stored] = await this.db.insert(invite).values(row).returning(INVITE_COLUMNS)
    return stored
  }

  async revoke(orgId: string, inviteId: string): Promise<void> {
    await this.db
      .update(invite)
      .set({ status: InviteStatus.Revoked })
      .where(and(eq(invite.orgId, orgId), eq(invite.id, inviteId), eq(invite.status, InviteStatus.Pending)))
  }

  async findByHash(tokenHash: string): Promise<InvitePreviewRecord | null> {
    const [row] = await this.db
      .select({ ...INVITE_COLUMNS, organizationName: organization.name })
      .from(invite)
      .innerJoin(organization, eq(invite.orgId, organization.id))
      .where(eq(invite.tokenHash, tokenHash))
    return row ?? null
  }

  // The invite row stays locked from the pending check to the accepted mark, so one token makes one account.
  accept(acceptance: { tokenHash: string; name: string; passwordHash: string; now: Date }): Promise<AcceptOutcome> {
    return this.db.transaction(async (tx): Promise<AcceptOutcome> => {
      const [pending] = await tx.select(INVITE_COLUMNS).from(invite).where(eq(invite.tokenHash, acceptance.tokenHash)).for('update')
      if (!pending) return { kind: AcceptOutcomeKind.Unknown }
      if (!isAcceptable(pending, acceptance.now)) return { kind: AcceptOutcomeKind.NotPending }
      const [account] = await tx
        .insert(userAccount)
        .values({ orgId: pending.orgId, email: pending.email, name: acceptance.name, passwordHash: acceptance.passwordHash, orgRole: pending.role })
        .onConflictDoNothing()
        .returning()
      if (!account) return { kind: AcceptOutcomeKind.MemberExists }
      await tx.insert(roleBinding).values({ orgId: pending.orgId, userId: account.id, subject: pending.role, scope: ORG_SCOPE })
      await tx.update(invite).set({ status: InviteStatus.Accepted, acceptedAt: acceptance.now }).where(eq(invite.id, pending.id))
      const [joined] = await tx.select({ name: organization.name }).from(organization).where(eq(organization.id, pending.orgId))
      return { kind: AcceptOutcomeKind.Accepted, account: { ...account, organizationName: joined.name } }
    })
  }
}
