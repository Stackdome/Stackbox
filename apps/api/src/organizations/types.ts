import type { InviteStatus, UserRole } from '@stackbox/contract'
import type { MembershipRefusal } from './calc/membership'

export type UserAccount = {
  id: string
  orgId: string
  email: string
  name: string | null
  passwordHash: string | null
  orgRole: UserRole
  tokenVersion: number
  createdAt: Date
}

export type UserProfile = UserAccount & { organizationName: string }

export type OrganizationRecord = { id: string; name: string; budgetCents: number; createdAt: Date }

export type OrganizationChanges = { name?: string; budgetCents?: number }

export type InviteRecord = {
  id: string
  orgId: string
  email: string
  role: UserRole
  status: InviteStatus
  expiresAt: Date
  acceptedAt: Date | null
  createdAt: Date
}

export type InvitePreviewRecord = InviteRecord & { organizationName: string }

export type NewInvite = { orgId: string; email: string; role: UserRole; tokenHash: string; createdBy: string | null; expiresAt: Date }

export const MemberOutcomeKind = { Changed: 'changed', Removed: 'removed', Refused: 'refused', Missing: 'missing' } as const

export type RoleChangeOutcome =
  | { kind: typeof MemberOutcomeKind.Changed; member: UserAccount }
  | { kind: typeof MemberOutcomeKind.Refused; refusal: MembershipRefusal }
  | { kind: typeof MemberOutcomeKind.Missing }

export type RemovalOutcome =
  | { kind: typeof MemberOutcomeKind.Removed }
  | { kind: typeof MemberOutcomeKind.Refused; refusal: MembershipRefusal }
  | { kind: typeof MemberOutcomeKind.Missing }

export const AcceptOutcomeKind = { Accepted: 'accepted', Unknown: 'unknown', NotPending: 'not_pending', MemberExists: 'member_exists' } as const

export type AcceptOutcome =
  | { kind: typeof AcceptOutcomeKind.Accepted; account: UserProfile }
  | { kind: typeof AcceptOutcomeKind.Unknown }
  | { kind: typeof AcceptOutcomeKind.NotPending }
  | { kind: typeof AcceptOutcomeKind.MemberExists }
