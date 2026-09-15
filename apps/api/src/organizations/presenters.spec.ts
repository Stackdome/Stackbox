import { InviteStatus, UserRole } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { presentInvite, presentMember, presentOrganization } from './presenters'
import { aUser } from './test-support/builders'

describe('the organization presenters', () => {
  it('presents an organization with its budget in cents', () => {
    expect(presentOrganization({ id: 'O1', name: 'acme', budgetCents: 50_000, createdAt: new Date('2026-07-20T09:00:00Z') })).toEqual({
      id: 'O1',
      name: 'acme',
      budget_cents: 50_000,
      created_at: '2026-07-20T09:00:00.000Z',
    })
  })

  it('presents a member with the role and the email standing in for a missing name', () => {
    expect(presentMember(aUser({ id: 'U2', name: null, email: 'vik@example.com', orgRole: UserRole.OrgMember }))).toEqual({
      id: 'U2',
      name: 'vik@example.com',
      email: 'vik@example.com',
      role: UserRole.OrgMember,
      created_at: '2026-09-13T10:00:00.000Z',
    })
  })

  it('presents an invite with its role and status, and nothing that could accept it', () => {
    const presented = presentInvite({
      id: 'I1',
      orgId: 'O1',
      email: 'grace@example.com',
      role: UserRole.OrgMember,
      status: InviteStatus.Expired,
      expiresAt: new Date('2026-09-22T10:00:00Z'),
      acceptedAt: null,
      createdAt: new Date('2026-09-15T10:00:00Z'),
    })

    expect(presented).toEqual({
      id: 'I1',
      email: 'grace@example.com',
      role: UserRole.OrgMember,
      status: InviteStatus.Expired,
      expires_at: '2026-09-22T10:00:00.000Z',
      created_at: '2026-09-15T10:00:00.000Z',
    })
  })
})
