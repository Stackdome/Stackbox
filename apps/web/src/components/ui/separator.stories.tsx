import type { Meta, StoryObj } from '@storybook/react-vite'
import { Separator } from './separator'

const meta = {
  title: 'Primitives/Separator',
  component: Separator,
  tags: ['ai-generated'],
} satisfies Meta<typeof Separator>

export default meta
type Story = StoryObj<typeof meta>

export const Horizontal: Story = {
  render: () => (
    <div className="w-72">
      <p className="text-sm">orders-api</p>
      <Separator className="my-3" />
      <p className="text-sm">billing-worker</p>
    </div>
  ),
}

export const Vertical: Story = {
  render: () => (
    <div className="flex h-8 items-center gap-3">
      <span className="text-sm">Repositories</span>
      <Separator orientation="vertical" />
      <span className="text-sm">Instances</span>
    </div>
  ),
}
