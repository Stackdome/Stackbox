import type { Meta, StoryObj } from '@storybook/react-vite'
import { StageTracker, type Stage } from './stage-tracker'

const meta = {
  title: 'Branded/StageTracker',
  component: StageTracker,
  tags: ['ai-generated'],
} satisfies Meta<typeof StageTracker>

export default meta
type Story = StoryObj<typeof meta>

const DEPLOY: Stage[] = [
  { key: 'build', label: 'Build', status: 'done' },
  { key: 'deploy', label: 'Deploy', status: 'done' },
  { key: 'ready', label: 'Ready', status: 'done' },
]

export const AllStages: Story = {
  args: { stages: DEPLOY },
}

export const FailedMidway: Story = {
  args: {
    stages: [
      { key: 'build', label: 'Build', status: 'done' },
      { key: 'deploy', label: 'Deploy', status: 'failed' },
      { key: 'ready', label: 'Ready', status: 'todo' },
    ],
  },
}

// Image-only stack: no build step, solid muted "skipped" fill, not a hollow todo ring.
export const BuildSkipped: Story = {
  args: {
    stages: [
      { key: 'build', label: 'Build', status: 'skipped' },
      { key: 'deploy', label: 'Deploy', status: 'active' },
      { key: 'ready', label: 'Ready', status: 'todo' },
    ],
  },
}

export const PausedOnImplementing: Story = {
  args: {
    stages: [
      { key: 'intake', label: 'Intake', status: 'done' },
      { key: 'preparing', label: 'Preparing', status: 'done' },
      { key: 'reproducing', label: 'Reproducing', status: 'done' },
      { key: 'implementing', label: 'Implementing', status: 'paused' },
      { key: 'deploying', label: 'Deploying', status: 'todo' },
      { key: 'verifying', label: 'Verifying', status: 'todo' },
      { key: 'hand_over', label: 'Hand over', status: 'todo' },
    ],
  },
}
