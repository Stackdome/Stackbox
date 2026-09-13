import type { Meta, StoryObj } from '@storybook/react-vite'
import { Kbd } from './kbd'

const meta = {
  title: 'Primitives/Kbd',
  component: Kbd,
  tags: ['ai-generated'],
  args: { keys: 'mod+enter' },
} satisfies Meta<typeof Kbd>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const SingleKey: Story = { args: { keys: 'esc' } }
export const WithShift: Story = { args: { keys: 'mod+shift+enter' } }
export const LetterKey: Story = { args: { keys: 'mod+k' } }
