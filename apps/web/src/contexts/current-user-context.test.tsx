// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { UserRole } from '@stackbox/contract'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { ReactNode } from 'react'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { makeUser } from '../../.storybook/fixtures'
import { useCurrentUser } from '@/hooks/use-current-user'
import { clearAuthSession } from '@/lib/common'
import { CurrentUserProvider } from './current-user-context'

const server = setupServer(http.get('*/api/v1/users/current', () => HttpResponse.json(makeUser({ name: 'Ada from the API', role: UserRole.OrgMember }))))

function wrapper({ children }: { children: ReactNode }) {
  return <CurrentUserProvider>{children}</CurrentUserProvider>
}

describe('CurrentUserProvider', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())
  beforeEach(() => localStorage.setItem('currentUser', JSON.stringify(makeUser({ name: 'Ada from storage' }))))

  it('replaces the stored user with the one the API answers when refreshed, role and all', async () => {
    const { result } = renderHook(() => useCurrentUser(), { wrapper })

    await act(() => result.current.refresh())

    expect([result.current.user?.name, result.current.isOrgAdmin, result.current.organisationId]).toEqual(['Ada from the API', false, 'org-1'])
  })

  it('forgets the user once the session is cleared', async () => {
    const { result } = renderHook(() => useCurrentUser(), { wrapper })

    act(() => clearAuthSession())

    expect([result.current.user, result.current.organisationId]).toEqual([null, null])
  })
})
