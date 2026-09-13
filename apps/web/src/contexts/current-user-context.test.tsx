// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { ReactNode } from 'react'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { makeUser } from '../../.storybook/fixtures'
import { useCurrentUser } from '@/hooks/use-current-user'
import { CurrentUserProvider } from './current-user-context'

const server = setupServer(http.get('*/api/v1/users/current', () => HttpResponse.json(makeUser({ name: 'Ada from the API' }))))

function wrapper({ children }: { children: ReactNode }) {
  return <CurrentUserProvider>{children}</CurrentUserProvider>
}

describe('CurrentUserProvider', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())

  it('replaces the stored user with the one the API answers when refreshed', async () => {
    localStorage.setItem('currentUser', JSON.stringify(makeUser({ name: 'Ada from storage' })))
    const { result } = renderHook(() => useCurrentUser(), { wrapper })

    await act(() => result.current.refresh())

    expect(result.current.user?.name).toBe('Ada from the API')
  })
})
