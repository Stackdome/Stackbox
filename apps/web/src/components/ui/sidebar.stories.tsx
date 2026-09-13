import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { Home, Settings } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from './sidebar'

function SidebarHarness({
  outlineVariant = false,
}: {
  outlineVariant?: boolean
}) {
  return (
    <SidebarProvider>
      <div className="flex h-64">
        <Sidebar collapsible="none">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive
                      variant={outlineVariant ? 'outline' : 'default'}
                    >
                      <Home />
                      <span>Instances</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton variant={outlineVariant ? 'outline' : 'default'}>
                      <Settings />
                      <span>Settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </div>
    </SidebarProvider>
  )
}

const meta = {
  title: 'Primitives/Sidebar',
  component: SidebarHarness,
  tags: ['ai-generated'],
} satisfies Meta<typeof SidebarHarness>

export default meta
type Story = StoryObj<typeof meta>

// Active item: ink tint (`--sidebar-accent`) + ink text, never orange.
export const ActiveItem: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const active = canvas.getByRole('button', { name: /instances/i })
    const style = getComputedStyle(active)
    expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(active.className).not.toContain('brand')
  },
}

// `variant="outline"` previously wrapped an already-resolved rgba() token in
// `hsl()`, an invalid color function that dropped the ring silently. Assert
// the parsed stylesheet actually paints a shadow now (D8: never a synthetic
// hover check).
export const OutlineVariant: Story = {
  args: { outlineVariant: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', { name: /settings/i })
    const style = getComputedStyle(button)
    expect(style.boxShadow).not.toBe('none')
    expect(style.boxShadow).not.toContain('hsl(')
  },
}

function ShellHarness({
  defaultOpen = true,
  collapsible = 'icon',
}: {
  defaultOpen?: boolean
  collapsible?: 'offcanvas' | 'icon' | 'none'
}) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar collapsible={collapsible}>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive tooltip="Instances">
                    <Home />
                    <span>Instances</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  )
}

// 240px at rest (§12): the width is a shell fact, not a guess off a screenshot.
export const Expanded: Story = {
  render: () => <ShellHarness />,
  play: async ({ canvasElement }) => {
    const container = canvasElement.querySelector('[data-slot="sidebar-container"]') as HTMLElement
    await expect(Math.round(container.getBoundingClientRect().width)).toBe(240)
  },
}

// 56px collapsed to icons (§12), the rail every screen falls back to under 1280.
export const Rail: Story = {
  render: () => <ShellHarness defaultOpen={false} collapsible="icon" />,
  play: async ({ canvasElement }) => {
    const container = canvasElement.querySelector('[data-slot="sidebar-container"]') as HTMLElement
    await expect(Math.round(container.getBoundingClientRect().width)).toBe(56)
  },
}
