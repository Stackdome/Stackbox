import { useEffect, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { useNavigate } from 'react-router-dom'
import { withCurrentUser } from '../../.storybook/decorators'
import { AppSidebar } from './app-sidebar'
import { SidebarProvider } from './ui/sidebar'
import { ROUTES, type RoutePath } from '@/lib/routes'

// The global preview decorator already supplies a MemoryRouter (nesting a
// second one throws); hop that router to Instances so its `isActive` check
// resolves before rendering.
function SidebarHarness({
  collapsed = false,
  badges,
}: {
  collapsed?: boolean
  badges?: Partial<Record<RoutePath, number>>
}) {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  useEffect(() => {
    navigate(ROUTES.instances, { replace: true })
    setReady(true)
  }, [navigate])
  if (!ready) return null
  return (
    <SidebarProvider defaultOpen={!collapsed}>
      <div className="flex h-[560px]">
        <AppSidebar badges={badges} />
      </div>
    </SidebarProvider>
  )
}

const meta = {
  title: 'Features/AppSidebar',
  component: SidebarHarness,
  tags: ['ai-generated'],
  decorators: [withCurrentUser],
} satisfies Meta<typeof SidebarHarness>

export default meta
type Story = StoryObj<typeof meta>

// Active route item (Instances, current path) reads as an ink tint, never
// brand orange text or icon fill.
//
// The geometry below is the board's, asserted here so the rail cannot drift
// from it silently. Numbers, not eyeballing.
export const Expanded: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const active = await canvas.findByRole('link', { name: /instances/i })
    expect(active.className).not.toContain('brand')
    const style = getComputedStyle(active)
    expect(style.color).not.toContain('255, 96, 7')

    // Board: 32px row, 8px inset, 10px icon-to-label, `md` corner.
    expect(active.getBoundingClientRect().height).toBe(32)
    expect(style.paddingLeft).toBe('8px')
    expect(style.paddingRight).toBe('8px')
    expect(style.columnGap).toBe('10px')
    expect(style.borderRadius).toBe('8px')

    // Board: selected is a CARD, sheet ground, `line/subtle` edge, `elevation/sm`.
    // Not a wash, and no hover or pressed rung above it.
    expect(style.backgroundColor).toBe('rgb(255, 255, 255)')
    expect(style.outlineWidth).toBe('1px')
    expect(style.outlineStyle).toBe('solid')
    expect(style.boxShadow).not.toBe('none')

    // Board: the group label is a 24px block: 4px, the 16px line, 4px. It
    // hangs off the group below it, so the air goes under, not over.
    const label = canvasElement.querySelector<HTMLElement>(
      '[data-slot="sidebar-group-label"]',
    )!
    const lcs = getComputedStyle(label)
    expect(label.getBoundingClientRect().height).toBe(24)
    expect(lcs.paddingTop).toBe('4px')
    expect(lcs.paddingBottom).toBe('4px')
    expect(lcs.paddingLeft).toBe('8px')

    // Board: the nav column is inset 12 with a 2px pitch between rows.
    const content = canvasElement.querySelector<HTMLElement>(
      '[data-sidebar="content"]',
    )!
    expect(getComputedStyle(content).paddingLeft).toBe('12px')

    // The collapsed hairline shares the label's block rather than stacking
    // under it, so it must be dead centre on both axes in both states, since
    // the two only ever cross-fade.
    expectRuleCentred(label)
  },
}

/** The hairline that replaces the group label on the collapsed rail lives
 *  inside the label's own 24px block. Assert the CENTRES agree, not just that
 *  it is present, since "somewhere in the box" is exactly the bug this had. */
function expectRuleCentred(label: HTMLElement) {
  const block = label.parentElement!
  const rule = block.querySelector<HTMLElement>('[aria-hidden]')!
  const b = block.getBoundingClientRect()
  const r = rule.getBoundingClientRect()
  expect(b.height).toBe(24)
  expect(r.height).toBe(1)
  expect(r.width).toBe(16)
  expect(Math.abs((r.top + r.bottom) / 2 - (b.top + b.bottom) / 2)).toBeLessThanOrEqual(0.5)
  expect(Math.abs((r.left + r.right) / 2 - (b.left + b.right) / 2)).toBeLessThanOrEqual(0.5)
}

export const Collapsed: Story = {
  args: { collapsed: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const active = await canvas.findByRole('link', { name: /instances/i })
    // Board: a 56px rail holding 32x32 rows. The selected row keeps the whole
    // card treatment: it is the same component, narrower.
    const style = getComputedStyle(active)
    const box = active.getBoundingClientRect()
    expect(box.height).toBe(32)
    expect(box.width).toBe(32)
    expect(style.backgroundColor).toBe('rgb(255, 255, 255)')
    expect(style.outlineWidth).toBe('1px')

    // This is the state the hairline exists for: it is the only thing left
    // saying where one group ends and the next begins.
    expectRuleCentred(
      canvasElement.querySelector<HTMLElement>('[data-slot="sidebar-group-label"]')!,
    )
  },
}

/** Five destinations, in order, grouped as the master plan specifies, and a
 *  task count reaching the sidebar through a plain prop. */
export const FiveItemsAndATaskBadge: Story = {
  args: { badges: { [ROUTES.tasks]: 3 } },
  play: async ({ canvasElement, canvas }) => {
    const content = within(canvasElement.querySelector<HTMLElement>('[data-sidebar="content"]')!)
    const links = content.getAllByRole('link').map((link) => link.textContent?.trim())
    await expect(links).toEqual(['Tasks', 'Applications', 'Instances', 'Repositories', 'Settings'])
    await expect(canvas.getByText('Organization')).toBeVisible()
    await expect(canvas.getByText('3')).toBeVisible()
  },
}
