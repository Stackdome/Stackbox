import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { CopyField } from './copy-field'

const meta = {
  title: 'Features/Settings/CopyField',
  component: CopyField,
  tags: ['ai-generated'],
  args: { id: 'invite-link', label: 'Invite link', value: 'http://localhost:5273/invites/preview-invite-grace' },
} satisfies Meta<typeof CopyField>

export default meta
type Story = StoryObj<typeof meta>

/** The value is a machine string, set in mono, read only, beside its Copy action. */
export const ShowsTheValue: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Invite link')).toHaveValue('http://localhost:5273/invites/preview-invite-grace')
    await expect(canvas.getByRole('button', { name: 'Copy' })).toBeVisible()
  },
}
