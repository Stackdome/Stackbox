import { UserRole } from '@stackbox/contract'

export const MembershipRefusal = { LastAdmin: 'last_admin', OwnAccount: 'own_account' } as const
export type MembershipRefusal = (typeof MembershipRefusal)[keyof typeof MembershipRefusal]

export type MemberRole = { id: string; orgRole: UserRole }

function isLastAdmin(members: MemberRole[], target: MemberRole): boolean {
  return target.orgRole === UserRole.OrgAdmin && members.filter((member) => member.orgRole === UserRole.OrgAdmin).length === 1
}

// Last admin is answered before own account, so an only admin acting on themself hears why no one could.
export function roleChangeRefusal(change: { callerId: string; target: MemberRole; role: UserRole; members: MemberRole[] }): MembershipRefusal | null {
  if (change.role !== UserRole.OrgAdmin && isLastAdmin(change.members, change.target)) return MembershipRefusal.LastAdmin
  if (change.callerId === change.target.id) return MembershipRefusal.OwnAccount
  return null
}

export function removalRefusal(removal: { callerId: string; target: MemberRole; members: MemberRole[] }): MembershipRefusal | null {
  if (isLastAdmin(removal.members, removal.target)) return MembershipRefusal.LastAdmin
  if (removal.callerId === removal.target.id) return MembershipRefusal.OwnAccount
  return null
}
