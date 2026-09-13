import type { Meta, StoryObj } from '@storybook/react-vite'
import { Skeleton } from './skeleton'

const meta = {
  title: 'Primitives/Skeleton',
  component: Skeleton,
  tags: ['ai-generated'],
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <Skeleton className="h-4 w-48" />,
}

export const Row: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-4 w-52" />
      <Skeleton className="h-4 w-40" />
    </div>
  ),
}

export const Avatar: Story = {
  render: () => <Skeleton className="size-8 rounded-full" />,
}
