import type { Meta, StoryObj } from '@storybook/react-vite'
import { TASK_SUMMARIES } from '../../../.storybook/fixtures'
import { toTask } from '@/api/mappers/task'
import { TaskRow } from './task-row'

const [needsYou, , running, , readyForReview, , failed, cancelled] = TASK_SUMMARIES.map(toTask)

const meta = {
  title: 'Features/Tasks/TaskRow',
  component: TaskRow,
  tags: ['ai-generated'],
  args: { task: running, onOpen: () => {}, onCancel: () => {} },
  decorators: [
    (Story) => (
      <div className="w-[1162px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TaskRow>

export default meta
type Story = StoryObj<typeof meta>

export const Running: Story = {}
export const NeedsYou: Story = { args: { task: needsYou } }
export const ReadyForReviewWithAMergedPullRequest: Story = { args: { task: readyForReview } }
export const FailedAfterTheRunLimit: Story = { args: { task: failed } }
export const Cancelled: Story = { args: { task: cancelled } }
