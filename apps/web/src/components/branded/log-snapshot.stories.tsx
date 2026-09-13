import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { LogSnapshot } from './log-snapshot'

const meta = {
  title: 'Branded/LogSnapshot',
  component: LogSnapshot,
  args: {
    lines: [
      '2026-07-30T11:59:01Z INFO  starting worker pool size=4',
      '2026-07-30T11:59:02Z INFO  connected to queue redis://queue:6379',
      '2026-07-30T11:59:15Z FATAL out of memory',
    ],
  },
} satisfies Meta<typeof LogSnapshot>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** A custom label replaces the default line-count summary. */
export const CustomLabel: Story = {
  args: { label: 'Last container output' },
}

/** No lines: nothing renders, not an empty box. */
export const Empty: Story = {
  args: { lines: [] },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('pre')).toBeNull()
  },
}
