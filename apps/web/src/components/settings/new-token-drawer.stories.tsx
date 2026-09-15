import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { NewTokenDrawer } from './new-token-drawer'

const CREATED = {
  id: 'token-2',
  name: 'deploy bot',
  prefix: 'sbx9f8e7',
  expiresAt: null,
  lastUsedAt: null,
  createdAt: '2026-09-15T10:00:00Z',
  secret: 'sbx9f8e7d6c5b4a39281706f5e4d3c2b1a0',
}

const meta = {
  title: 'Features/Settings/NewTokenDrawer',
  component: NewTokenDrawer,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen' },
  args: { open: true, onOpenChange: () => {}, onSubmit: async () => CREATED },
} satisfies Meta<typeof NewTokenDrawer>

export default meta
type Story = StoryObj<typeof meta>

const drawerOf = async () => within(await within(document.body).findByRole('dialog', { name: 'New API token' }))

/** Opened from API tokens: 90 days picked, Create waits for a name. */
export const Blank: Story = {
  play: async () => {
    const drawer = await drawerOf()
    await expect(drawer.getByRole('radio', { name: '90 days' })).toBeChecked()
    await expect(drawer.getByRole('button', { name: 'Create' })).toBeDisabled()
  },
}

/** Created: the secret is shown this once, to copy, with Done to close. */
export const ShowsTheSecretOnce: Story = {
  play: async () => {
    const drawer = await drawerOf()
    await userEvent.type(drawer.getByLabelText(/^Name/), 'deploy bot')
    await userEvent.click(drawer.getByRole('radio', { name: 'Never' }))
    await userEvent.click(drawer.getByRole('button', { name: 'Create' }))

    await expect(await drawer.findByLabelText('Token')).toHaveValue('sbx9f8e7d6c5b4a39281706f5e4d3c2b1a0')
    await expect(drawer.getByText('Copy the token now. It is not shown again.')).toBeVisible()
  },
}
