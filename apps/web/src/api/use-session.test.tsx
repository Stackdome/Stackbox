// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react'
import { InviteStatus } from '@stackbox/contract'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { makeUser, PREVIEW_ACCOUNTS_SEED, PREVIEW_INVITE_TOKEN, PREVIEW_PASSWORD } from '../../.storybook/fixtures'
import { getCurrentUser } from '@/lib/common'
import { PreviewAccounts, accountHandlers, sessionGate } from '@/preview/handlers/accounts'
import { useInvitePreview, useJoin, useRedirectWhenSignedIn, useSignIn } from './use-session'

function RedirectProbe({ to }: { to: string }) {
  useRedirectWhenSignedIn(to)
  return <p>Sign in form</p>
}

function renderRedirectProbe() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<RedirectProbe to="/tasks" />} />
        <Route path="/tasks" element={<p>Tasks landing</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const server = setupServer()
let accounts: PreviewAccounts

describe('the session hooks', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())
  beforeEach(() => {
    localStorage.clear()
    accounts = new PreviewAccounts(PREVIEW_ACCOUNTS_SEED)
    accounts.signOut()
    server.resetHandlers(sessionGate(accounts), ...accountHandlers(accounts))
  })
  afterEach(() => cleanup())

  it('signs in and stores the signed in user', async () => {
    const { result } = renderHook(() => useSignIn())

    await act(() => result.current({ email: 'vik@example.com', password: PREVIEW_PASSWORD, organizationId: null }))

    expect(getCurrentUser()?.email).toBe('vik@example.com')
  })

  it('reads a pending invite and joins it, storing the new member', async () => {
    const preview = renderHook(() => useInvitePreview(PREVIEW_INVITE_TOKEN))
    const join = renderHook(() => useJoin(PREVIEW_INVITE_TOKEN))
    await waitFor(() => expect(preview.result.current.loading).toBe(false))

    await act(() => join.result.current({ name: 'Grace Hopper', password: 'a long enough password' }))

    expect([preview.result.current.preview?.status, getCurrentUser()?.email]).toEqual([InviteStatus.Pending, 'grace@example.com'])
  })

  it('answers no preview and the refusal for a link that matches no invite', async () => {
    const { result } = renderHook(() => useInvitePreview('no-such-token'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect([result.current.preview, result.current.error !== null]).toEqual([null, true])
  })
})

describe('useRedirectWhenSignedIn', () => {
  const redirectServer = setupServer()

  beforeAll(() => redirectServer.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => redirectServer.close())
  beforeEach(() => localStorage.clear())
  afterEach(() => cleanup())

  it('tries the refresh cookie before asking for the current user, and lands past Sign in once it answers', async () => {
    let refreshCalls = 0
    redirectServer.resetHandlers(
      http.post('*/api/v1/auth/refresh', () => {
        refreshCalls += 1
        return new HttpResponse(null, { status: 204 })
      }),
      http.get('*/api/v1/users/current', () => HttpResponse.json(makeUser())),
    )

    renderRedirectProbe()

    expect(await screen.findByText('Tasks landing')).toBeInTheDocument()
    expect(refreshCalls).toBe(1)
  })

  it('stays on Sign in when the refresh cookie is gone', async () => {
    redirectServer.resetHandlers(http.post('*/api/v1/auth/refresh', () => HttpResponse.json({ code: 'invalid_refresh', message: 'Sign in again' }, { status: 401 })))

    renderRedirectProbe()

    expect(await screen.findByText('Sign in form')).toBeInTheDocument()
  })
})
