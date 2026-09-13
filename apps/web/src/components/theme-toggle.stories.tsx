import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { ThemeToggle } from './theme-toggle'
import { THEME_STORAGE_KEY } from '@/contexts/theme-provider'

const meta = {
  title: 'Features/ThemeToggle',
  component: ThemeToggle,
  tags: ['ai-generated'],
} satisfies Meta<typeof ThemeToggle>

export default meta
type Story = StoryObj<typeof meta>

// A floating icon control (topbar, 404 page) reads as a physical control on
// `--control` fill rather than the transparent `ghost` material used for
// in-row/toolbar icon buttons. Asserted against the parsed stylesheet per the
// plate rubric (never a synthetic-hover check).
export const Default: Story = {
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: /toggle theme/i })
    const style = getComputedStyle(button)
    expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(style.backgroundColor).not.toBe('transparent')
  },
}

// The auth header is a nav-equivalent row that already has its own chrome
// (the room + plate), so the toggle sits flat at rest like the website's
// `.auth-top-right .icon-btn`: no fill, no border, no shadow.
export const OnAuthHeader: Story = {
  args: { variant: 'ghost' },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: /toggle theme/i })
    const style = getComputedStyle(button)
    expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(style.boxShadow).toBe('none')
  },
}

/**
 * The preview's global decorator supplies `ThemeProvider`, never the story.
 * Flipping the toggle puts `dark` on the root and changes the page's own
 * ground, proving the mechanism end to end rather than just the button.
 */
export const FlipsTheRootToDark: Story = {
  play: async ({ canvas, userEvent }) => {
    const root = document.documentElement
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    try {
      const lightGround = getComputedStyle(document.body).backgroundColor
      await userEvent.click(canvas.getByRole('button', { name: /theme/i }))
      await expect(root.classList.contains('dark')).toBe(true)
      await expect(getComputedStyle(document.body).backgroundColor).not.toBe(lightGround)
    } finally {
      if (storedTheme === null) localStorage.removeItem(THEME_STORAGE_KEY)
      else localStorage.setItem(THEME_STORAGE_KEY, storedTheme)
    }
  },
}
