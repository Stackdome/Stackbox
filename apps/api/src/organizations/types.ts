import type { InviteStatus, UserRole } from '@stackbox/contract'

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
