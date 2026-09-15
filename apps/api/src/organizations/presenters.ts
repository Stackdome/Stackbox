import type { components } from '@stackbox/contract'
import type { InviteRecord, OrganizationRecord, UserAccount } from './types'

type Schemas = components['schemas']

export function presentOrganization(record: OrganizationRecord): Schemas['Organization'] {
  return { id: record.id, name: record.name, budget_cents: record.budgetCents, created_at: record.createdAt.toISOString() }
}

export function presentMember(account: UserAccount): Schemas['Member'] {
  return { id: account.id, name: account.name ?? account.email, email: account.email, role: account.orgRole, created_at: account.createdAt.toISOString() }
}

export function presentInvite(record: InviteRecord): Schemas['Invite'] {
  return {
    id: record.id,
    email: record.email,
    role: record.role,
    status: record.status,
    expires_at: record.expiresAt.toISOString(),
    created_at: record.createdAt.toISOString(),
  }
}
