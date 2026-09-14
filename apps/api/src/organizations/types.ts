import type { UserRole } from '@stackbox/contract'

export type UserAccount = {
  id: string
  orgId: string
  email: string
  name: string | null
  passwordHash: string | null
  orgRole: UserRole
  createdAt: Date
}

export type UserProfile = UserAccount & { organizationName: string }
