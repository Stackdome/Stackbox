import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { withConfirm, withCurrentUser, withSheetHeader, withTasks } from '../../../.storybook/decorators'
import { PREVIEW_APPLICATION_SUMMARIES, PREVIEW_CATALOG_SEED, TASK_DETAILS, TASK_SUMMARIES } from '../../../.storybook/fixtures'
import { baselineHandlers } from '../../../.storybook/msw-handlers'
import { catalogHandlers } from '@/preview/handlers/catalog'
import { taskHandlers } from '@/preview/handlers/tasks'
import { ROUTES } from '@/lib/routes'
import { ApplicationDetailPage } from './application-detail-page'

const on = (applicationId: string) => ({ router: { initialEntries: [`/applications/${applicationId}`], path: ROUTES.application } })

const meta = {
  title: 'Pages/ApplicationDetail',
  component: ApplicationDetailPage,
  tags: ['ai-generated'],
  decorators: [withSheetHeader, withConfirm, withTasks, withCurrentUser],
  parameters: {
    layout: 'fullscreen',
    ...on('app-shop'),
    msw: [
      ...catalogHandlers(PREVIEW_CATALOG_SEED, { delayMs: 300 }),
      ...taskHandlers(TASK_SUMMARIES, PREVIEW_APPLICATION_SUMMARIES, TASK_DETAILS),
      ...baselineHandlers,
    ],
  },
} satisfies Meta<typeof ApplicationDetailPage>

export default meta
type Story = StoryObj<typeof meta>

/** State 1: shop, synced, four services across its repository and a stock image, recent tasks. */
export const OverviewHealthy: Story = {
  play: async ({ canvas }) => {
    const stackfile = await canvas.findByRole('region', { name: 'Stackfile' })
    await expect(stackfile).toHaveTextContent('Synced')
  },
}

/** State 2: billing, not synced since a1b2c3d, services marked stale. */
export const OverviewStale: Story = {
  parameters: on('app-billing'),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('region', { name: 'Stackfile' })).toHaveTextContent('Not synced since a1b2c3d')
  },
}

/** Contract 07: Re-sync spins, then the synced sha moves and the stale marks clear. */
export const ResyncClearsTheStaleMark: Story = {
  parameters: on('app-billing'),
  play: async ({ canvas }) => {
    const stackfile = await canvas.findByRole('region', { name: 'Stackfile' })
    await userEvent.click(within(stackfile).getByRole('button', { name: 'Re-sync' }))

    await waitFor(() => expect(stackfile).toHaveTextContent('9f8e7d6'), { timeout: 5000 })
    await expect(stackfile).not.toHaveTextContent('Not synced since')
  },
}

/** State 3: ledger, the validation error and its path in a banner under the header. */
export const OverviewValidationFailed: Story = {
  parameters: on('app-ledger'),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toHaveTextContent('services.worker: needs a path or an image')
  },
}

/** State 4: the Services tab, a stock image with no repository included. */
export const ServicesTab: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('tab', { name: 'Services' }))

    await expect(await canvas.findByText('postgres:17')).toBeVisible()
  },
}

/** State 5: the Config tab with two credential refs and the danger zone. */
export const ConfigTab: Story = {
  parameters: on('app-billing'),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('tab', { name: 'Config' }))

    await expect(await canvas.findByText('vault://acme/stripe')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Disconnect application' })).toBeVisible()
  },
}

/** Contract 07: disconnecting an application whose tasks still run answers the refusal inside the typed confirm. */
export const DisconnectRefusedWhileTasksRun: Story = {
  play: async ({ canvas, canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(await canvas.findByRole('tab', { name: 'Config' }))
    await userEvent.click(await canvas.findByRole('button', { name: 'Disconnect application' }))
    await userEvent.type(await body.findByLabelText('Type shop to confirm'), 'shop')

    await userEvent.click(within(body.getByRole('alertdialog')).getByRole('button', { name: 'Disconnect application' }))

    await expect(await body.findByText("Cancel or finish this application's running tasks first")).toBeVisible()
  },
}

/** M8: New task from an application page is locked to that application. */
export const NewTaskLockedToTheApplication: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'New task' }))

    const drawer = await within(canvasElement.ownerDocument.body).findByRole('dialog', { name: 'New task' })

    await waitFor(() => expect(within(drawer).getByRole('combobox', { name: /Application/ })).toHaveTextContent('shop'))
    await expect(within(drawer).getByRole('combobox', { name: /Application/ })).toBeDisabled()
  },
}
