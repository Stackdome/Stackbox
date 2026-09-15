import type { Meta, StoryObj } from '@storybook/react-vite'
import { UserRole } from '@stackbox/contract'
import { expect } from 'storybook/test'
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
