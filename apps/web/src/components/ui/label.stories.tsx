import type { Meta, StoryObj } from '@storybook/react-vite'
import { Label } from './label'
import { Input } from './input'

const meta = {
  title: 'Primitives/Label',
  component: Label,
  tags: ['ai-generated'],
  args: { children: 'Repository name' },
} satisfies Meta<typeof Label>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithField: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-1.5">
      <Label htmlFor="repo-name">Repository name</Label>
      <Input id="repo-name" placeholder="orders-api" />
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className="group flex w-72 flex-col gap-1.5" data-disabled="true">
      <Label htmlFor="repo-name-disabled">Repository name</Label>
      <Input id="repo-name-disabled" placeholder="orders-api" disabled />
    </div>
  ),
}
