import type { Meta, StoryObj } from '@storybook/react-vite'
import { StackboxMark } from './stackbox-mark'

const meta = {
  title: 'Branded/StackboxMark',
  component: StackboxMark,
} satisfies Meta<typeof StackboxMark>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
