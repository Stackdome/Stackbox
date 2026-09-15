// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
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

  it('lists the members with the signed in admin unremovable, and removes another member after asking', async () => {
    renderSettings(ROUTES.settingsMembers)
    const members = await screen.findByRole('region', { name: 'Members' })
    expect(await within(members).findByText('Vik Rao')).toBeInTheDocument()

    await userEvent.click(within(members).getByRole('button', { name: 'Remove Vik Rao' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Remove' }))

    expect(await within(members).findByText('Dev Ito')).toBeInTheDocument()
    expect([within(members).queryByText('Vik Rao'), within(members).queryByRole('button', { name: 'Remove Ada Lovelace' })]).toEqual([null, null])
  })

  it('invites an email from the drawer, shows the link once, and lists it as pending', async () => {
    renderSettings(ROUTES.settingsMembers)
    await screen.findByRole('region', { name: 'Members' })

    await userEvent.click(screen.getByRole('button', { name: 'Invite' }))
    const drawer = within(await screen.findByRole('dialog', { name: 'Invite a member' }))
    await userEvent.type(drawer.getByLabelText(/^Email/), 'hopper@example.com')
    await userEvent.click(drawer.getByRole('button', { name: 'Invite' }))

    expect(((await drawer.findByLabelText('Invite link')) as HTMLInputElement).value).toMatch(/\/invites\/[0-9a-f-]{36}$/)
    // hidden: true — the modal drawer is still open, so the region behind it is correctly aria-hidden from assistive tech; this checks the write landed, not accessibility exposure.
    expect(await within(screen.getByRole('region', { name: 'Pending invites', hidden: true })).findByText('hopper@example.com')).toBeInTheDocument()
  })
})
