import type { Meta, StoryObj } from '@storybook/react-vite'
import { Textarea } from './textarea'

const meta = {
  title: 'Primitives/Textarea',
  component: Textarea,
  tags: ['ai-generated'],
  args: { placeholder: 'Describe the problem the agent should fix.' },
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Filled: Story = {
  args: { defaultValue: 'Checkout fails with a 500 when the cart has more than 20 items.' },
}

export const Disabled: Story = { args: { disabled: true } }
