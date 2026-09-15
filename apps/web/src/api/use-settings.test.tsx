// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { ApiTokenExpiryDays, UserRole } from '@stackbox/contract'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ORG_ID, PREVIEW_ACCOUNTS_SEED } from '../../.storybook/fixtures'
import { PreviewAccounts, accountHandlers, sessionGate } from '@/preview/handlers/accounts'
import { settingsErrorMessage } from './errors'
import { useApiTokens, useMembers, useOrganization } from './use-settings'

const server = setupServer()

describe('the settings hooks', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())
  beforeEach(() => {
    const accounts = new PreviewAccounts(PREVIEW_ACCOUNTS_SEED)
    server.resetHandlers(sessionGate(accounts), ...accountHandlers(accounts))
  })

  it('reads the organization and saves a new name and budget', async () => {
    const { result } = renderHook(() => useOrganization(ORG_ID))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(() => result.current.save({ name: 'acme labs', budget: '600' }))

    expect([result.current.organization?.name, result.current.organization?.budgetDollars]).toEqual(['acme labs', 600])
  })

  it('lists the members by name with the signed in member marked, and the pending invites', async () => {
    const { result } = renderHook(() => useMembers(ORG_ID, 'u1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect([result.current.members.map((member) => [member.name, member.isYou]), result.current.invites.map((invite) => invite.email)]).toEqual([
      [
        ['Ada Lovelace', true],
        ['Dev Ito', false],
        ['Vik Rao', false],
      ],
      ['grace@example.com'],
    ])
  })

  it('invites an email, answers a link to copy on this origin, and lists the new invite', async () => {
    const { result } = renderHook(() => useMembers(ORG_ID, 'u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const created = await act(() => result.current.invite({ email: 'hopper@example.com', role: UserRole.OrgMember }))

    await waitFor(() => expect(result.current.invites.map((invite) => invite.email)).toContain('hopper@example.com'))
    expect(created.link.startsWith(`${window.location.origin}/invites/`)).toBe(true)
  })

  it('refuses to demote the last admin in the words of the refusal', async () => {
    const { result } = renderHook(() => useMembers(ORG_ID, 'u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const refused = await result.current.changeRole('u1', UserRole.OrgMember).catch((error: unknown) => error)

    expect(settingsErrorMessage(refused, 'fallback')).toBe('Make another member an admin first')
  })

  it('creates a token whose secret is answered once, then lists the token without it', async () => {
    const { result } = renderHook(() => useApiTokens())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const created = await act(() => result.current.create({ name: 'deploy bot', expiry: ApiTokenExpiryDays.Month }))

    await waitFor(() => expect(result.current.tokens.map((token) => token.name)).toEqual(['deploy bot', 'CI deploys']))
    expect(['secret' in result.current.tokens[0], created.secret.startsWith(created.prefix)]).toEqual([false, true])
  })

  it('revokes a token and drops it from the list', async () => {
    const { result } = renderHook(() => useApiTokens())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(() => result.current.revoke('token-1'))

    expect(result.current.tokens).toEqual([])
  })
})
