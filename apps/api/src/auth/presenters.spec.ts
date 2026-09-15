import { UserRole } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { aUser } from '../organizations/test-support/builders'
import { presentApiToken, presentCurrentUser } from './presenters'

describe('presentCurrentUser', () => {
  it('names the organization the account signed in to', () => {
    expect(presentCurrentUser(aUser({ id: 'U1', orgId: 'O1', organizationName: 'acme', orgRole: UserRole.OrgMember }))).toEqual({
      id: 'U1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      role: UserRole.OrgMember,
      organization: { id: 'O1', name: 'acme' },
    })
  })

  it('lets the email stand in for an account with no name', () => {
    expect(presentCurrentUser(aUser({ name: null })).name).toBe('ada@example.com')
  })
})

describe('presentApiToken', () => {
  it('shows the prefix and the dates, and nothing that could act as the token', () => {
    const presented = presentApiToken({
      id: 'T1',
      userId: 'U1',
      orgId: 'O1',
      name: 'ci',
      prefix: 'sbx4Jq2p',
      expiresAt: null,
      lastUsedAt: new Date('2026-09-15T09:00:00Z'),
      revokedAt: null,
      createdAt: new Date('2026-09-01T10:00:00Z'),
    })

    expect(presented).toEqual({
      id: 'T1',
      name: 'ci',
      prefix: 'sbx4Jq2p',
      expires_at: null,
      last_used_at: '2026-09-15T09:00:00.000Z',
      created_at: '2026-09-01T10:00:00.000Z',
    })
  })
})
