import { MembershipRefusal } from './calc/membership'

export const ORGANIZATION_NOT_FOUND = { code: 'organization_not_found', message: 'organization not found' } as const

export const MEMBER_NOT_FOUND = { code: 'member_not_found', message: 'member not found' } as const

export const LAST_ADMIN = { code: 'last_admin', message: 'Make another member an admin first' } as const

export const OWN_ACCOUNT = { code: 'own_account', message: 'Ask another admin to change your own membership' } as const

export const REFUSAL_ERROR: Record<MembershipRefusal, { code: string; message: string }> = {
  [MembershipRefusal.LastAdmin]: LAST_ADMIN,
  [MembershipRefusal.OwnAccount]: OWN_ACCOUNT,
}

export const MEMBER_EXISTS = { code: 'member_exists', message: 'This email is already a member of the organization' } as const

export const INVITE_PENDING = { code: 'invite_pending', message: 'This email already has a pending invite' } as const

export const UNKNOWN_INVITE = { code: 'unknown_invite', message: 'This invite link does not match any invite' } as const

export const INVITE_NOT_PENDING = { code: 'invite_not_pending', message: 'This invite was already accepted, revoked or has expired' } as const
