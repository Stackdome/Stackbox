import type { Meta, StoryObj } from '@storybook/react-vite'
import { UserRole } from '@stackbox/contract'
import { expect, userEvent, within } from 'storybook/test'
import { withConfirm, withCurrentUser, withSheetHeader } from '../../../.storybook/decorators'
import { PREVIEW_ACCOUNTS_SEED, makeUser } from '../../../.storybook/fixtures'
import { baselineHandlers } from '../../../.storybook/msw-handlers'
import { ROUTES } from '@/lib/routes'
import { PreviewAccounts, accountHandlers } from '@/preview/handlers/accounts'
import { SettingsPage, SettingsTab } from './settings-page'

const accountsHandlers = () => [...accountHandlers(new PreviewAccounts(PREVIEW_ACCOUNTS_SEED)), ...baselineHandlers]

const meta = {
  title: 'Pages/Settings',
  component: SettingsPage,
  tags: ['ai-generated'],
  decorators: [withSheetHeader, withConfirm, withCurrentUser],
  args: { tab: SettingsTab.General },
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: [ROUTES.settings] },
    msw: accountsHandlers(),
  },
} satisfies Meta<typeof SettingsPage>

export default meta
type Story = StoryObj<typeof meta>

/** General: the organization name and monthly budget, Save the one filled button. */
export const General: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByDisplayValue('acme')).toBeVisible()
    await expect(canvas.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'true')
  },
}

/** Prompt 01 state 4 carried to the page: a member who opens Settings by address sees why there is nothing here. */
export const MemberSeesNoSettings: Story = {
  beforeEach: () => {
    localStorage.setItem('currentUser', JSON.stringify(makeUser({ role: UserRole.OrgMember })))
    return () => localStorage.setItem('currentUser', JSON.stringify(makeUser()))
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Settings are for admins')).toBeVisible()
  },
}

/** Members: 64px rows, the admin's own row blocked, Invite in the header, the pending invite below. */
export const Members: Story = {
  args: { tab: SettingsTab.Members },
  parameters: { router: { initialEntries: [ROUTES.settingsMembers] }, msw: accountsHandlers() },
  play: async ({ canvas, canvasElement }) => {
    const members = within(await canvas.findByRole('region', { name: 'Members' }))
    await expect(await members.findByText('Vik Rao')).toBeVisible()
    await expect(members.queryByRole('button', { name: 'Remove Ada Lovelace' })).toBeNull()
    await expect(canvasElement.querySelector('[data-slot="member-list"] [data-slot="data-list-row"]')?.getBoundingClientRect().height).toBe(64)
    await expect(within(canvas.getByRole('region', { name: 'Pending invites' })).getByText('grace@example.com')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Invite' }))
    await expect(await within(document.body).findByRole('dialog', { name: 'Invite a member' })).toBeVisible()
  },
}
