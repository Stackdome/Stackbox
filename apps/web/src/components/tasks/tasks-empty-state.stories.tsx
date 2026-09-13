import type { Meta, StoryObj } from '@storybook/react-vite'
import { TasksEmptyState } from './tasks-empty-state'

const meta = {
  title: 'Features/Tasks/TasksEmptyState',
  component: TasksEmptyState,
  tags: ['ai-generated'],
  args: { hasApplications: true },
} satisfies Meta<typeof TasksEmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const WithApplications: Story = {}
export const WithoutApplications: Story = { args: { hasApplications: false } }
