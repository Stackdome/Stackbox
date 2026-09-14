import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { withCurrentUser, withSheetHeader } from '../../../.storybook/decorators'
import { EMPTY_CATALOG_SEED, PREVIEW_CATALOG_SEED } from '../../../.storybook/fixtures'
import { baselineHandlers } from '../../../.storybook/msw-handlers'
import { catalogHandlers } from '@/preview/handlers/catalog'
import { ROUTES } from '@/lib/routes'
import { ApplicationsPage } from './applications-page'

const VIEW_KEY = 'stackbox.view.applications'
const STORY_DELAY_MS = 300

const meta = {
  title: 'Pages/Applications',
  component: ApplicationsPage,
  tags: ['ai-generated'],
  decorators: [withSheetHeader, withCurrentUser],
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: [ROUTES.applications] },
    msw: [...catalogHandlers(PREVIEW_CATALOG_SEED, { delayMs: STORY_DELAY_MS }), ...baselineHandlers],
  },
  beforeEach: () => {
    localStorage.removeItem(VIEW_KEY)
  },
} satisfies Meta<typeof ApplicationsPage>

export default meta
type Story = StoryObj<typeof meta>

/** State 2: three applications, one healthy, one stale, one that failed validation. */
export const List: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-slot="data-list-row"]')).toHaveLength(3))
  },
}

/** State 3: the same applications as cards, the choice remembered. */
export const Cards: Story = {
  beforeEach: () => {
    localStorage.setItem(VIEW_KEY, 'cards')
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('[data-slot="application-cards"]')).not.toBeNull())
  },
}

/** State 1: nothing connected yet. */
export const Empty: Story = {
  parameters: { msw: [...catalogHandlers(EMPTY_CATALOG_SEED, { delayMs: STORY_DELAY_MS }), ...baselineHandlers] },
}

/** State 4: a search with no result. */
export const Searching: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByRole('searchbox', { name: 'Search applications' }), 'zzz')

    await expect(await canvas.findByText('No applications match')).toBeVisible()
  },
}
