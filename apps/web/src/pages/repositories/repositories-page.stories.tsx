import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { withConfirm, withCurrentUser, withSheetHeader } from '../../../.storybook/decorators'
import { EMPTY_CATALOG_SEED, GITHUB_CONNECTION, PREVIEW_CATALOG_SEED } from '../../../.storybook/fixtures'
import { baselineHandlers } from '../../../.storybook/msw-handlers'
import { catalogHandlers } from '@/preview/handlers/catalog'
import { ROUTES } from '@/lib/routes'
import { RepositoriesPage } from './repositories-page'

const STORY_DELAY_MS = 300

const meta = {
  title: 'Pages/Repositories',
  component: RepositoriesPage,
  tags: ['ai-generated'],
  decorators: [withSheetHeader, withConfirm, withCurrentUser],
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: [ROUTES.repositories] },
    msw: [...catalogHandlers(PREVIEW_CATALOG_SEED, { delayMs: STORY_DELAY_MS }), ...baselineHandlers],
  },
} satisfies Meta<typeof RepositoriesPage>

export default meta
type Story = StoryObj<typeof meta>

/** State 1: no provider connected yet. */
export const Empty: Story = {
  parameters: { msw: [...catalogHandlers(EMPTY_CATALOG_SEED, { delayMs: STORY_DELAY_MS }), ...baselineHandlers] },
}

/** State 2: one GitHub connection, three repositories, acme/billing backs two applications. */
export const OneConnectionThreeRepositories: Story = {
  parameters: {
    msw: [...catalogHandlers({ ...PREVIEW_CATALOG_SEED, connections: [GITHUB_CONNECTION] }, { delayMs: STORY_DELAY_MS }), ...baselineHandlers],
  },
}

/** State 3: GitHub plus a GitLab connection that needs re-auth, with a Reconnect action on its header. */
export const TwoProvidersNeedsReauth: Story = {
  play: async ({ canvas }) => {
    const gitlab = await canvas.findByRole('region', { name: 'GitLab acme-platform' })
    await expect(within(gitlab).getByText('Needs re-auth')).toBeVisible()
    await expect(within(gitlab).getByText('No repositories added yet')).toBeVisible()
  },
}

/** State 4: the Add repositories drawer with two picked; the footer counts them. */
export const AddRepositoriesDrawerOpen: Story = {
  play: async ({ canvas, canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const github = await canvas.findByRole('region', { name: 'GitHub acme' })
    await userEvent.click(within(github).getByRole('button', { name: 'Add repositories' }))
    const drawer = await page.findByRole('dialog', { name: 'Add repositories' })

    await userEvent.click(await within(drawer).findByRole('option', { name: /acme\/acme-api/ }))
    await userEvent.click(within(drawer).getByRole('option', { name: /acme\/infra/ }))

    await expect(within(drawer).getByRole('button', { name: 'Add 2 repositories' })).toBeEnabled()
  },
}

/** State 5: removing acme/billing names both applications it backs. */
export const RemoveBlocked: Story = {
  play: async ({ canvas, canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    await userEvent.click(await canvas.findByRole('button', { name: 'Actions for acme/billing' }))
    await userEvent.click(await page.findByRole('menuitem', { name: 'Remove' }))

    const dialog = await page.findByRole('dialog', { name: 'Remove is blocked' })

    await waitFor(() =>
      expect(within(dialog).getByRole('list', { name: 'Applications using this repository' }).textContent).toBe('billingledger'),
    )
  },
}

/** State 6: the Connect provider drawer. */
export const ConnectProviderDrawerOpen: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Connect provider' }))

    await expect(await within(canvasElement.ownerDocument.body).findByRole('textbox', { name: 'Account login' })).toBeVisible()
  },
}
