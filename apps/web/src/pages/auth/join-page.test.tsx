// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PREVIEW_ACCOUNTS_SEED, PREVIEW_INVITE_TOKEN } from '../../../.storybook/fixtures'
import { getCurrentUser } from '@/lib/common'
import { ROUTES, invitePath } from '@/lib/routes'
import { PreviewAccounts, accountHandlers, sessionGate } from '@/preview/handlers/accounts'
import { JoinPage } from './join-page'

const server = setupServer()
let accounts: PreviewAccounts

function renderJoin(token: string) {
  window.history.pushState({}, '', invitePath(token))
  render(
    <MemoryRouter initialEntries={[invitePath(token)]}>
      <Routes>
        <Route path={ROUTES.invite} element={<JoinPage />} />
        <Route path={ROUTES.tasks} element={<p>Tasks landing</p>} />
        <Route path={ROUTES.login} element={<p>Sign in landing</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('the Join page', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())
  beforeEach(() => {
    localStorage.clear()
    accounts = new PreviewAccounts(PREVIEW_ACCOUNTS_SEED)
    accounts.signOut()
    server.resetHandlers(sessionGate(accounts), ...accountHandlers(accounts))
  })
  afterEach(() => cleanup())

  it('joins the organization from a pending invite, signed in, and lands on Tasks', async () => {
    renderJoin(PREVIEW_INVITE_TOKEN)

    await userEvent.type(await screen.findByLabelText(/^Name/), 'Grace Hopper')
    await userEvent.type(screen.getByLabelText(/^Password/), 'a long enough password')
    await userEvent.click(screen.getByRole('button', { name: 'Join acme' }))

    expect(await screen.findByText('Tasks landing')).toBeInTheDocument()
    expect(getCurrentUser()?.email).toBe('grace@example.com')
  })

  it('says an invite was already accepted and offers Sign in instead of the form', async () => {
    accounts.accept(PREVIEW_INVITE_TOKEN, { name: 'Grace Hopper', password: 'a long enough password' })
    accounts.signOut()

    renderJoin(PREVIEW_INVITE_TOKEN)

    expect(await screen.findByText('This invite was already accepted. Sign in instead.')).toBeInTheDocument()
    expect([screen.getByRole('link', { name: 'Go to Sign in' }), screen.queryByRole('button', { name: 'Join acme' })]).toEqual([expect.anything(), null])
  })

  it('says a link that matches no invite', async () => {
    renderJoin('no-such-token')

    expect(await screen.findByText('This invite link does not match any invite')).toBeInTheDocument()
  })
})
