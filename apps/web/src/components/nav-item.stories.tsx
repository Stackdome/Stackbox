import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { ListChecks } from 'lucide-react'
import { NavItem } from './nav-item'
import { SidebarMenu, SidebarProvider } from './ui/sidebar'
import { ROUTES } from '@/lib/routes'
import type { NavItem as NavItemData } from './nav-items'

const item: NavItemData = { label: 'Tasks', path: ROUTES.tasks, icon: ListChecks }

function Harness({ badge }: { badge?: number }) {
  return (
    <SidebarProvider>
      <div className="w-60">
        <SidebarMenu>
          <NavItem item={item} badge={badge} />
        </SidebarMenu>
      </div>
    </SidebarProvider>
  )
}

const meta = {
  title: 'Features/NavItem',
  component: Harness,
  tags: ['ai-generated'],
  parameters: { router: { initialEntries: [ROUTES.tasks] } },
} satisfies Meta<typeof Harness>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Active on its own path: reads as a card, not a wash. */
export const Active: Story = {
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'Tasks' })
    await expect(link.getAttribute('data-active')).toBe('true')
  },
}

/** A count reaches the row as a badge, positioned beside the label rather
 *  than folded into its accessible name. */
export const WithBadge: Story = {
  args: { badge: 3 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Tasks' })).toBeInTheDocument()
    await expect(canvas.getByText('3')).toBeVisible()
  },
}
