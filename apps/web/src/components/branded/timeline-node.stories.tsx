import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent } from 'storybook/test'
import { RailNode, TimelineRail } from './timeline-rail'
import { TimelineNode } from './timeline-node'

const meta = {
  title: 'Branded/TimelineNode',
  component: TimelineNode,
  tags: ['ai-generated'],
  args: { title: 'Fix verified: failed' },
} satisfies Meta<typeof TimelineNode>

export default meta
type Story = StoryObj<typeof meta>

export const Landed: Story = {
  render: () => (
    <TimelineRail>
      <RailNode tone="ok" isLast>
        <TimelineNode identity="Run 1" title="Reproduced: passed" time="10:42:08" state={{ word: 'Passed', tone: 'ok' }} detail="a1b2c3d" />
      </RailNode>
    </TimelineRail>
  ),
}

function Disclosing() {
  const [open, setOpen] = useState(false)
  return (
    <TimelineRail>
      <RailNode tone="err" shape="ring" isLast>
        <TimelineNode
          identity="Run 2"
          title="Fix verified: failed"
          time="11:02:40"
          state={{ word: 'Failed', tone: 'err' }}
          detail="expected the payment step, found the cart"
          open={open}
          onToggle={() => setOpen(!open)}
        >
          <p className="text-meta text-fg-2">The verify run could not reach the payment step.</p>
        </TimelineNode>
      </RailNode>
    </TimelineRail>
  )
}

/** The disclosure leads the row and reveals the body under it. */
export const OpensItsDetail: Story = {
  render: () => <Disclosing />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Fix verified: failed/ }))
    await expect(canvas.getByText('The verify run could not reach the payment step.')).toBeVisible()
  },
}
