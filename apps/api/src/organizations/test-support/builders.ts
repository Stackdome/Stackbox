import { UserRole } from '@stackbox/contract'
import type { UserProfile } from '../types'

export function aUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'U1',
    orgId: 'O1',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    passwordHash: null,
    orgRole: UserRole.OrgAdmin,
    createdAt: new Date('2026-09-13T10:00:00Z'),
    organizationName: 'acme',
    ...overrides,
  }
}
