import { UserRole } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { makeUser } from '../../../.storybook/fixtures'
import { toCurrentUser, toLoginRequest } from './current-user'

describe('the current user mapper', () => {
  it('reads an admin with the organization they signed in to', () => {
    expect(toCurrentUser(makeUser())).toEqual({
      id: 'u1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      role: UserRole.OrgAdmin,
      isOrgAdmin: true,
      organizationId: 'org-1',
      organizationName: 'acme',
    })
  })

  it('reads a member as no admin', () => {
    expect(toCurrentUser(makeUser({ role: UserRole.OrgMember })).isOrgAdmin).toBe(false)
  })

  it('sends the chosen organization only once one is chosen, and the email trimmed', () => {
    expect([
      toLoginRequest({ email: ' ada@example.com ', password: 'password', organizationId: null }),
      toLoginRequest({ email: 'ada@example.com', password: 'password', organizationId: 'org-2' }),
    ]).toEqual([
      { email: 'ada@example.com', password: 'password' },
      { email: 'ada@example.com', password: 'password', organization_id: 'org-2' },
    ])
  })
})
