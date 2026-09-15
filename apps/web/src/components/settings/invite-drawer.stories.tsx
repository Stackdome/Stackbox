import type { Meta, StoryObj } from '@storybook/react-vite'
import { InviteStatus, UserRole } from '@stackbox/contract'
import { AxiosError } from 'axios'
import { expect, userEvent, within } from 'storybook/test'
import { InviteDrawer } from './invite-drawer'

const CREATED = {
  id: 'invite-2',
  email: 'hopper@example.com',
  role: UserRole.OrgAdmin,
  roleLabel: 'Admin',
  status: InviteStatus.Pending,
  expiresAt: '2026-09-22T10:00:00Z',
  createdAt: '2026-09-15T10:00:00Z',
  link: 'http://localhost:5273/invites/abc123',
}

const meta = {
  title: 'Features/Settings/InviteDrawer',
  component: InviteDrawer,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen' },
  args: { open: true, onOpenChange: () => {}, onSubmit: async () => CREATED },
} satisfies Meta<typeof InviteDrawer>

export default meta
type Story = StoryObj<typeof meta>

const drawerOf = async () => within(await within(document.body).findByRole('dialog', { name: 'Invite a member' }))

/** Opened from Members: Member picked, Invite waits for an email. */
export const Blank: Story = {
  play: async () => {
    const drawer = await drawerOf()
    await expect(drawer.getByRole('radio', { name: 'Member' })).toBeChecked()
    await expect(drawer.getByRole('button', { name: 'Invite' })).toBeDisabled()
  },
}

/** Sent: the link is shown once, to copy, with Done to close. */
export const ShowsTheLinkOnceSent: Story = {
  play: async () => {
    const drawer = await drawerOf()
    await userEvent.type(drawer.getByLabelText(/^Email/), 'hopper@example.com')
    await userEvent.click(drawer.getByRole('radio', { name: 'Admin' }))
    await userEvent.click(drawer.getByRole('button', { name: 'Invite' }))

    await expect(await drawer.findByLabelText('Invite link')).toHaveValue('http://localhost:5273/invites/abc123')
    await expect(drawer.getByRole('button', { name: 'Done' })).toBeVisible()
  },
}

/** A refusal is said in the drawer's footer, in the api's words, and the form stays. */
export const RefusalStaysInTheDrawer: Story = {
  args: {
    onSubmit: async () => {
      const error = new AxiosError('request failed')
      error.response = { status: 409, statusText: '', headers: {}, config: {} as never, data: { code: 'member_exists', message: 'This email is already a member of the organization' } }
      throw error
    },
  },
  play: async () => {
    const drawer = await drawerOf()
    await userEvent.type(drawer.getByLabelText(/^Email/), 'vik@example.com')
    await userEvent.click(drawer.getByRole('button', { name: 'Invite' }))

    await expect(await drawer.findByText('This email is already a member of the organization')).toBeVisible()
    await expect(drawer.getByLabelText(/^Email/)).toHaveValue('vik@example.com')
  },
}
