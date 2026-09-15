import type { ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { NavUser } from './nav-user'
import { SidebarMenu, SidebarProvider } from './ui/sidebar'

function Harness(props: ComponentProps<typeof NavUser>) {
  return (
    <SidebarProvider>
      <div className="w-60">
        <SidebarMenu>
          <NavUser {...props} />
        </SidebarMenu>
      </div>
    </SidebarProvider>
  )
}

const meta = {
  title: 'Features/NavUser',
  component: Harness,
  tags: ['ai-generated'],
  args: {
    onSignOut: () => {},
    user: { name: 'Ada Lovelace', email: 'ada@example.com', avatar: '', organisation: 'acme' },
  },
} satisfies Meta<typeof Harness>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** No organisation on the account: the email fills the second line instead. */
export const NoOrganisation: Story = {
  args: { user: { name: 'Ada Lovelace', email: 'ada@example.com', avatar: '' } },
}

/** The menu opens on click, with Sign out the one action in it. The menu
 *  content portals to `document.body`, outside the story's own canvas. */
export const OpensToSignOut: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /account menu/i }))
    await waitFor(async () => {
      await expect(within(document.body).getByRole('menuitem', { name: 'Sign out' })).toBeVisible()
    })
  },
}
