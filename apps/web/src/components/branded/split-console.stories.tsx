import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { SplitConsole } from './split-console'

const meta = {
  title: 'Branded/SplitConsole',
  component: SplitConsole,
  tags: ['ai-generated'],
  args: {
    sourcesTitle: 'Checks',
    allLabel: 'every check',
    sources: [
      { id: 'reproduced', label: 'Reproduced', state: { word: 'passed', tone: 'ok' } },
      { id: 'verified', label: 'Fix verified', state: { word: 'failed', tone: 'err' } },
    ],
    lines: [
      { id: 'l1', sourceId: 'reproduced', tone: 'ok', at: '10:42:08', message: 'Observed the dead Checkout button.' },
      { id: 'l2', sourceId: 'verified', tone: 'err', at: '11:02:40', message: 'FAIL checkout.spec.ts' },
      { id: 'l3', sourceId: 'verified', tone: 'muted', at: '11:02:40', message: 'expected the payment step, found the cart' },
    ],
  },
} satisfies Meta<typeof SplitConsole>

export default meta
type Story = StoryObj<typeof meta>

export const EverySource: Story = {}

/** Picking a source narrows the activity to its lines. */
export const NarrowsToOneSource: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Reproduced/ }))
    await expect(canvas.queryByText('FAIL checkout.spec.ts')).toBeNull()
  },
}

/** A test log has no sources: the activity takes the whole width. */
export const LogOnly: Story = {
  args: {
    sources: [],
    lines: [
      { id: 'l1', message: 'FAIL checkout.spec.ts' },
      { id: 'l2', message: '  expected the payment step, found the cart' },
    ],
  },
}
