import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { APPLICATIONS } from '../../../.storybook/fixtures'
import { NO_FILTER } from './filter-tasks'
import { TasksToolbar } from './tasks-toolbar'

function ToolbarHarness() {
  const [filter, setFilter] = useState(NO_FILTER)
  return <TasksToolbar filter={filter} onFilterChange={setFilter} applications={APPLICATIONS} />
}

const meta = {
  title: 'Features/Tasks/TasksToolbar',
  component: ToolbarHarness,
  tags: ['ai-generated'],
} satisfies Meta<typeof ToolbarHarness>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
