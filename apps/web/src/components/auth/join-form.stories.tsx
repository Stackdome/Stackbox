import type { Meta, StoryObj } from '@storybook/react-vite'
import { InviteStatus, UserRole } from '@stackbox/contract'
import { expect, userEvent } from 'storybook/test'
import { AuthFrame } from './auth-frame'
import { JoinForm } from './join-form'

const PREVIEW = { organizationName: 'acme', email: 'grace@example.com', role: UserRole.OrgMember, roleLabel: 'Member', status: InviteStatus.Pending }

const meta = {
  title: 'Features/Auth/JoinForm',
  component: JoinForm,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <AuthFrame title="Join acme">
        <Story />
      </AuthFrame>
    ),
  ],
  args: { preview: PREVIEW, onSubmit: async () => {} },
} satisfies Meta<typeof JoinForm>

export default meta
type Story = StoryObj<typeof meta>

/** A pending invite: who joins, as what, and one owning control named for the organization. */
export const Pending: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Joining as grace@example.com, Member')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Join acme' }).getBoundingClientRect().height).toBe(40)
  },
}

/** A password under eight characters is refused before anything is sent. */
export const ShortPasswordSaysSo: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText(/^Name/), 'Grace Hopper')
    await userEvent.type(canvas.getByLabelText(/^Password/), 'short')
    await userEvent.click(canvas.getByRole('button', { name: 'Join acme' }))

    await expect(canvas.getByRole('alert')).toHaveTextContent('Use a password of at least 8 characters')
  },
}

/** Retyping either field clears the stale refusal instead of leaving it beside the new attempt. */
export const RetypingClearsTheStaleRefusal: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText(/^Name/), 'Grace Hopper')
    await userEvent.type(canvas.getByLabelText(/^Password/), 'short')
    await userEvent.click(canvas.getByRole('button', { name: 'Join acme' }))
    await expect(canvas.getByRole('alert')).toHaveTextContent('Use a password of at least 8 characters')

    await userEvent.type(canvas.getByLabelText(/^Name/), ' Hopper')

    await expect(canvas.getByRole('alert')).toBeEmptyDOMElement()
  },
}
