import type { components } from '@stackbox/contract'
import { UserRole } from '@stackbox/contract'

type Schemas = components['schemas']
export type User = Schemas['User']
export type Organization = Schemas['Organisation']

export const ORG_ID = 'org-1'

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    name: 'Ada Lovelace',
    username: 'ada',
    email: 'ada@example.com',
    organisation: 'acme',
    organisation_id: ORG_ID,
    role: UserRole.OrgAdmin,
    ...overrides,
  }
}

export function makeOrganization(overrides: Partial<Organization> = {}): Organization {
  return {
    id: ORG_ID,
    name: 'acme',
    is_platform: false,
    created_at: '2026-07-20T09:00:00Z',
    updated_at: '2026-07-20T09:00:00Z',
    ...overrides,
  }
}
