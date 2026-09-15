// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { makeUser } from '../../.storybook/fixtures'
import { clearAuthSession, getCurrentUser, setAuthSession } from './common'

describe('the stored current user', () => {
  beforeEach(() => localStorage.clear())

  it('reads back the current user stored at sign in', () => {
    setAuthSession(makeUser())

    expect(getCurrentUser()?.organization.name).toBe('acme')
  })

  it('reads a stored value without an organization as no one signed in', () => {
    localStorage.setItem('currentUser', JSON.stringify({ id: 'u1', name: 'Ada Lovelace', organisation_id: 'org-1' }))

    expect(getCurrentUser()).toBeNull()
  })

  it('forgets the user once the session is cleared', () => {
    setAuthSession(makeUser())

    clearAuthSession()

    expect(getCurrentUser()).toBeNull()
  })
})
