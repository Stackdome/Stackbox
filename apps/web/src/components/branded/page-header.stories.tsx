import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { PageHeader } from './page-header'

function Slots() {
  return (
    <div>
      <div id="sheet-identity" />
      <div id="topnav-actions" />
      <div id="sheet-toolbar" />
    </div>
  )
}

const meta = {
  title: 'Branded/PageHeader',
  component: PageHeader,
  decorators: [
    (Story) => (
      <div>
        <Slots />
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PageHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    status: <span>20 applications</span>,
    actions: <button type="button">New</button>,
  },
}

// status and actions portal into the sheet header's right slot, in order.
export const PortalsStatusThenActions: Story = {
  args: {
    status: <span>20 applications</span>,
    actions: <button type="button">New</button>,
  },
  play: async ({ canvasElement }) => {
    const slot = canvasElement.querySelector('#topnav-actions')!
    const text = slot.textContent ?? ''
    await expect(text.indexOf('20 applications')).toBeLessThan(text.indexOf('New'))
  },
}

export const ToolbarOnly: Story = {
  args: {
    toolbar: <input placeholder="Search" />,
  },
  play: async ({ canvasElement }) => {
    const slot = canvasElement.querySelector('#sheet-toolbar')!
    await expect(slot.querySelector('input')).not.toBeNull()
  },
}
