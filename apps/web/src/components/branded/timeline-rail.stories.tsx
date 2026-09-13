import type { Meta, StoryObj } from '@storybook/react-vite'
import { RailNode, TimelineRail } from './timeline-rail'
import { TimelineNode } from './timeline-node'

const meta = {
  title: 'Branded/TimelineRail',
  component: TimelineRail,
  tags: ['ai-generated'],
  args: { children: null },
} satisfies Meta<typeof TimelineRail>

export default meta
type Story = StoryObj<typeof meta>

/** Solid landed, hollow never finished, spinner in flight: the only three marks (§16). */
export const EveryMark: Story = {
  render: () => (
    <TimelineRail>
      <RailNode tone="ok">
        <TimelineNode identity="Run 1" title="Reproduced: passed" time="10:42:08" state={{ word: 'Passed', tone: 'ok' }} />
      </RailNode>
      <RailNode tone="err" shape="ring">
        <TimelineNode identity="Run 1" title="Fix verified: failed" time="11:02:40" state={{ word: 'Failed', tone: 'err' }} />
      </RailNode>
      <RailNode tone="amber" shape="spinner" isLast>
        <TimelineNode identity="Run 2" title="Fix verified" state={{ word: 'In flight', tone: 'amber' }} />
      </RailNode>
    </TimelineRail>
  ),
}
