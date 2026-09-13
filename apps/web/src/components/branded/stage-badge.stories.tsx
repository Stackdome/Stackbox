import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { StageBadge } from './stage-badge'

const meta = {
  title: 'Branded/StageBadge',
  component: StageBadge,
} satisfies Meta<typeof StageBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Build: Story = { args: { stage: 'build' } }
export const Runtime: Story = { args: { stage: 'runtime' } }
export const Init: Story = { args: { stage: 'init' } }
export const Validation: Story = { args: { stage: 'validation' } }

export const AllStages: Story = {
  args: { stage: 'build' },
  render: () => (
    <div className="flex gap-2">
      <StageBadge stage="build" />
      <StageBadge stage="runtime" />
      <StageBadge stage="init" />
      <StageBadge stage="validation" />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('validation')).toHaveClass('text-danger')
  },
}
