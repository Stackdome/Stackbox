import type { components } from '@stackbox/contract'
import type { OrganizationRecord, UserAccount } from './types'

type Schemas = components['schemas']

export function presentOrganization(record: OrganizationRecord): Schemas['Organization'] {
  return { id: record.id, name: record.name, budget_cents: record.budgetCents, created_at: record.createdAt.toISOString() }
}

export function presentMember(account: UserAccount): Schemas['Member'] {
  return { id: account.id, name: account.name ?? account.email, email: account.email, role: account.orgRole, created_at: account.createdAt.toISOString() }
}
