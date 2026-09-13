import type { Meta, StoryObj } from '@storybook/react-vite'
import { Avatar, AvatarFallback, AvatarImage } from './avatar'

const meta = {
  title: 'Primitives/Avatar',
  component: Avatar,
  tags: ['ai-generated'],
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://i.pravatar.cc/64?img=12" alt="Priya Nair" />
      <AvatarFallback>PN</AvatarFallback>
    </Avatar>
  ),
}

export const Fallback: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="/does-not-resolve.png" alt="Jordan Lee" />
      <AvatarFallback>JL</AvatarFallback>
    </Avatar>
  ),
}
