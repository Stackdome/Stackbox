import type { Meta, StoryObj } from '@storybook/react-vite'
import { TASK_SUMMARIES } from '../../../.storybook/fixtures'
import { toTask } from '@/api/mappers/task'
import { TaskList, TaskListSkeleton } from './task-list'

const meta = {
  title: 'Features/Tasks/TaskList',
  component: TaskList,
  tags: ['ai-generated'],
  args: { tasks: TASK_SUMMARIES.map(toTask), onOpen: () => {}, onCancel: () => {} },
} satisfies Meta<typeof TaskList>

export default meta
type Story = StoryObj<typeof meta>

export const EightRows: Story = {}

export const LoadingFiveRows: Story = {
  render: () => <TaskListSkeleton />,
}
