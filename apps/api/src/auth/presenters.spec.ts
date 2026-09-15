import { UserRole } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { aUser } from '../organizations/test-support/builders'
import { presentCurrentUser } from './presenters'

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
