import type { Meta, StoryObj } from '@storybook/react-vite'
import { Panel } from './panel'

const meta = {
  title: 'Branded/Panel',
  component: Panel,
  args: {
    title: 'Resources',
    children: <p className="text-body text-foreground">Panel body content.</p>,
  },
} satisfies Meta<typeof Panel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithCountAndAction: Story = {
  args: { count: 4, action: <button type="button">Manage</button> },
}

/** The sentence-case heading used on the redesigned surfaces. */
export const SoftTone: Story = { args: { tone: 'soft', count: 4 } }

/** No header at all, just the body, for a panel with nothing to title. */
export const Bare: Story = { args: { title: undefined, bare: true } }

/** Frames the panel with the danger border to flag a section-level error. */
export const Invalid: Story = { args: { invalid: true } }
