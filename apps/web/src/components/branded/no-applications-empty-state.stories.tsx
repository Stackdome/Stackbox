import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { NoApplicationsEmptyState } from './no-applications-empty-state'

const meta = {
  title: 'Branded/NoApplicationsEmptyState',
  component: NoApplicationsEmptyState,
} satisfies Meta<typeof NoApplicationsEmptyState>

export default meta
type Story = StoryObj<typeof meta>

/** The Spin up drawer's wording; the New task drawer passes its own title and description onto the same action. */
export const SpinUp: Story = {
  args: {
    title: 'No application to spin up',
    description: 'An Application Instance runs one application. Connect one, then spin it up.',
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Connect an application first' })).toHaveAttribute('href', '/applications')
  },
}
