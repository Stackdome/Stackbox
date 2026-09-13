import type { Meta, StoryObj } from '@storybook/react-vite'
import { EyebrowLabel } from './eyebrow-label'

const meta = {
  title: 'Branded/EyebrowLabel',
  component: EyebrowLabel,
  args: { children: 'Section' },
} satisfies Meta<typeof EyebrowLabel>

export default meta
type Story = StoryObj<typeof meta>

export const Brand: Story = {}
export const Muted: Story = { args: { tone: 'muted' } }
