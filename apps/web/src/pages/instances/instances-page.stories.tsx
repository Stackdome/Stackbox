import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { withCurrentUser, withSheetHeader } from '../../../.storybook/decorators'
import { EMPTY_CATALOG_SEED, PREVIEW_CATALOG_SEED } from '../../../.storybook/fixtures'
import { baselineHandlers } from '../../../.storybook/msw-handlers'
import { catalogHandlers } from '@/preview/handlers/catalog'
import { ROUTES } from '@/lib/routes'
import { InstancesPage } from './instances-page'

const VIEW_KEY = 'stackbox.view.instances'
const STORY_DELAY_MS = 300
const ROWS = '[data-slot="data-list-row"]'

const meta = {
  title: 'Pages/Instances',
  component: InstancesPage,
  tags: ['ai-generated'],
  decorators: [withSheetHeader, withCurrentUser],
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: [ROUTES.instances] },
    msw: [...catalogHandlers(PREVIEW_CATALOG_SEED, { delayMs: STORY_DELAY_MS }), ...baselineHandlers],
  },
  beforeEach: () => {
    localStorage.removeItem(VIEW_KEY)
  },
} satisfies Meta<typeof InstancesPage>

export default meta
type Story = StoryObj<typeof meta>

/** State 1: seven instances in use, three of them task instances, the provisioning one the only thing that moves. */
export const List: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll(ROWS)).toHaveLength(7))
  },
}

/** State 2: the organization has applications but nothing is running yet. */
export const Empty: Story = {
  parameters: { msw: [...catalogHandlers({ ...PREVIEW_CATALOG_SEED, instances: [] }, { delayMs: STORY_DELAY_MS }), ...baselineHandlers] },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No Application Instances yet')).toBeVisible()
  },
}

/** State 2, no applications: the empty state sends the person to connect one. */
export const EmptyWithNoApplications: Story = {
  parameters: { msw: [...catalogHandlers(EMPTY_CATALOG_SEED, { delayMs: STORY_DELAY_MS }), ...baselineHandlers] },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: 'Connect an application' })).toBeVisible()
  },
}

/** State 3: the same instances as cards, the choice remembered. */
export const Cards: Story = {
  beforeEach: () => {
    localStorage.setItem(VIEW_KEY, 'cards')
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('[data-slot="instance-cards"]')).not.toBeNull())
  },
}

/** Contract 08: the purpose filter narrows to the three task instances. */
export const FilteredToTaskInstances: Story = {
  play: async ({ canvas, canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll(ROWS)).toHaveLength(7))
    await userEvent.click(within(canvas.getByRole('radiogroup', { name: 'Purpose' })).getByRole('radio', { name: 'Task' }))

    await waitFor(() => expect(canvasElement.querySelectorAll(ROWS)).toHaveLength(3))
  },
}

/** Contract 08: Show torn down reveals the torn down instance, muted. */
export const ShowTornDown: Story = {
  play: async ({ canvas, canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll(ROWS)).toHaveLength(7))
    await userEvent.click(canvas.getByRole('switch', { name: 'Show torn down' }))

    await waitFor(() => expect(canvasElement.querySelectorAll(`${ROWS}[data-muted="true"]`)).toHaveLength(1))
  },
}

/** Contract 08: Spin up opens the drawer. */
export const SpinUpOpensTheDrawer: Story = {
  play: async ({ canvas, canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll(ROWS)).toHaveLength(7))
    await userEvent.click(canvas.getByRole('button', { name: 'Spin up' }))

    await expect(await within(canvasElement.ownerDocument.body).findByRole('dialog', { name: 'Spin up application instance' })).toBeVisible()
  },
}
