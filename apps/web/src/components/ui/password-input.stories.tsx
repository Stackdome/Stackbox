import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { PasswordInput } from './password-input'

const meta = {
  title: 'Primitives/PasswordInput',
  component: PasswordInput,
  tags: ['ai-generated'],
  args: { placeholder: 'Access token' },
} satisfies Meta<typeof PasswordInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Filled: Story = { args: { defaultValue: 'ghp_1234567890abcdef' } }

export const RevealsOnToggle: Story = {
  args: { defaultValue: 'ghp_1234567890abcdef' },
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByPlaceholderText('Access token')
    await expect(input).toHaveAttribute('type', 'password')
    const toggle = canvas.getByRole('button', { name: 'Show password' })
    await userEvent.click(toggle)
    await expect(input).toHaveAttribute('type', 'text')
    await expect(canvas.getByRole('button', { name: 'Hide password' })).toBeInTheDocument()
  },
}
