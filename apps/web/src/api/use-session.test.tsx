// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { InviteStatus } from '@stackbox/contract'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PREVIEW_ACCOUNTS_SEED, PREVIEW_INVITE_TOKEN, PREVIEW_PASSWORD } from '../../.storybook/fixtures'
import { getCurrentUser } from '@/lib/common'
import { PreviewAccounts, accountHandlers, sessionGate } from '@/preview/handlers/accounts'
import { useInvitePreview, useJoin, useSignIn } from './use-session'

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
