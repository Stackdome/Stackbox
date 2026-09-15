// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserRole } from '@stackbox/contract'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PREVIEW_ACCOUNTS_SEED, makeUser } from '../../../.storybook/fixtures'
import { ConfirmProvider } from '@/components/branded/confirm'
import { CurrentUserProvider } from '@/contexts/current-user-context'
import { ROUTES } from '@/lib/routes'
import { PreviewAccounts, accountHandlers, sessionGate } from '@/preview/handlers/accounts'
import { SheetHost } from '@/test-support/sheet-host'
import { SettingsPage, SettingsTab } from './settings-page'

const server = setupServer()

function renderSettings(path: string) {
  render(
    <CurrentUserProvider>
      <ConfirmProvider>
        <MemoryRouter initialEntries={[path]}>
          <SheetHost>
            <Routes>
              <Route path={ROUTES.settings} element={<SettingsPage tab={SettingsTab.General} />} />
              <Route path={ROUTES.settingsMembers} element={<SettingsPage tab={SettingsTab.Members} />} />
              <Route path={ROUTES.settingsTokens} element={<SettingsPage tab={SettingsTab.Tokens} />} />
            </Routes>
          </SheetHost>
        </MemoryRouter>
      </ConfirmProvider>
    </CurrentUserProvider>,
  )
}

describe('the Settings page', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())
  beforeEach(() => {
    localStorage.setItem('currentUser', JSON.stringify(makeUser()))
    const accounts = new PreviewAccounts(PREVIEW_ACCOUNTS_SEED)
    server.resetHandlers(sessionGate(accounts), ...accountHandlers(accounts))
  })
  afterEach(() => cleanup())

  it('renames the organization, and Save goes quiet again once saved', async () => {
    renderSettings(ROUTES.settings)
    const name = await screen.findByLabelText(/^Organization name/)

    await userEvent.clear(name)
    await userEvent.type(name, 'acme labs')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByDisplayValue('acme labs')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('keeps the header title Settings on every tab', async () => {
    renderSettings(ROUTES.settingsMembers)

    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
  })

  it('shows a member no settings', async () => {
    localStorage.setItem('currentUser', JSON.stringify(makeUser({ role: UserRole.OrgMember })))

    renderSettings(ROUTES.settings)

    expect([await screen.findByText('Settings are for admins'), screen.queryByRole('tab', { name: 'General' })]).toEqual([expect.anything(), null])
  })
})
