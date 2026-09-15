import { MembershipRefusal } from './calc/membership'

export const ORGANIZATION_NOT_FOUND = { code: 'organization_not_found', message: 'organization not found' } as const

export const MEMBER_NOT_FOUND = { code: 'member_not_found', message: 'member not found' } as const

export const LAST_ADMIN = { code: 'last_admin', message: 'Make another member an admin first' } as const

export const OWN_ACCOUNT = { code: 'own_account', message: 'Ask another admin to change your own membership' } as const

export const REFUSAL_ERROR: Record<MembershipRefusal, { code: string; message: string }> = {
  [MembershipRefusal.LastAdmin]: LAST_ADMIN,
  [MembershipRefusal.OwnAccount]: OWN_ACCOUNT,
}
