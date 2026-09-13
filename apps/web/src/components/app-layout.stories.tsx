import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { withCurrentUser } from '../../.storybook/decorators'
import { AppLayout } from './app-layout'
import { ROUTES } from '@/lib/routes'

const meta = {
  title: 'Features/AppLayout',
  component: AppLayout,
  tags: ['ai-generated'],
  decorators: [withCurrentUser],
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: [ROUTES.instances] },
  },
  args: {
    children: <p className="text-body">Instance list</p>,
  },
} satisfies Meta<typeof AppLayout>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Instances' })).toBeInTheDocument()
  },
}

/** The title row's own toggle collapses the expanded sidebar to the same
 *  56px rail the icon-only state always measures. The width change is
 *  transitioned, so it is awaited rather than read the instant the class
 *  flips. Pinned expanded rather than relying on the test viewport crossing
 *  the 1280px breakpoint: the live breakpoint itself is `useShellOpen`'s own
 *  test. */
export const ManualToggleCollapsesToRail: Story = {
  args: { defaultSidebarOpen: true },
  play: async ({ canvasElement, canvas }) => {
    const container = canvasElement.querySelector<HTMLElement>('[data-slot="sidebar-container"]')!
    await expect(container.getBoundingClientRect().width).toBe(240)
    await userEvent.click(canvas.getByRole('button', { name: 'Toggle Sidebar' }))
    await waitFor(() => expect(container.getBoundingClientRect().width).toBe(56))
  },
}
