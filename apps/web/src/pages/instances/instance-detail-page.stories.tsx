import type { Meta, StoryObj } from '@storybook/react-vite'
import { UserRole } from '@stackbox/contract'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { withConfirm, withCurrentUser, withSheetHeader } from '../../../.storybook/decorators'
import { INSTANCE_IDS, makeUser, PREVIEW_CATALOG_SEED } from '../../../.storybook/fixtures'
import { baselineHandlers } from '../../../.storybook/msw-handlers'
import { catalogHandlers } from '@/preview/handlers/catalog'
import { ROUTES, instancePath } from '@/lib/routes'
import { InstanceDetailPage } from './instance-detail-page'

const on = (instanceId: string) => ({ router: { initialEntries: [instancePath(instanceId)], path: ROUTES.instance } })
const STATUS_PILL = '[data-slot="instance-status"]'

const meta = {
  title: 'Pages/InstanceDetail',
  component: InstanceDetailPage,
  tags: ['ai-generated'],
  decorators: [withSheetHeader, withConfirm, withCurrentUser],
  parameters: {
    layout: 'fullscreen',
    ...on(INSTANCE_IDS.persistent),
    msw: [...catalogHandlers(PREVIEW_CATALOG_SEED, { delayMs: 300, releaseWalkMs: [600, 1_500] }), ...baselineHandlers],
  },
} satisfies Meta<typeof InstanceDetailPage>

export default meta
type Story = StoryObj<typeof meta>

/** Prompt 09 state 5: provisioning, the rail's one building node the page's one moving thing, Deploy blocked. */
export const Provisioning: Story = {
  parameters: on(INSTANCE_IDS.taskProvisioning),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Provisioning', { selector: STATUS_PILL })).toBeVisible()
    const releases = canvas.getByRole('region', { name: 'Releases' })
    await expect(releases.querySelectorAll('[data-shape="spinner"]')).toHaveLength(1)
    await expect(within(releases).getByRole('button', { name: 'Deploy' })).toBeDisabled()
  },
}

/** Prompt 09 state 1: the persistent instance, ready, two landed releases and no expiry. */
export const Ready: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Ready', { selector: STATUS_PILL })).toBeVisible()
    await expect(canvas.getByText('No expiry', { selector: '[data-slot="expiry-text"]' })).toBeVisible()
    await expect(canvas.getByRole('region', { name: 'Releases' }).querySelectorAll('[data-shape="solid"]')).toHaveLength(2)
  },
}

/** Prompt 09 state 6: degraded, the failed latest release named in a banner under the header. */
export const Degraded: Story = {
  parameters: on(INSTANCE_IDS.degraded),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toHaveTextContent('The latest release failed')
  },
}

/** Prompt 09 state 7: expired, the banner, Spin up again and Tear down, Deploy blocked. */
export const Expired: Story = {
  parameters: on(INSTANCE_IDS.taskExpired),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('This instance expired 2h ago')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Spin up again' })).toBeVisible()
    await expect(within(canvas.getByRole('region', { name: 'Releases' })).getByRole('button', { name: 'Deploy' })).toBeDisabled()
  },
}

/** Torn down: the header says so, the rail and rows are muted, and no action is left. */
export const TornDown: Story = {
  parameters: on(INSTANCE_IDS.tornDown),
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText('Torn down', { selector: STATUS_PILL })).toBeVisible()
    await expect(canvasElement.querySelector('[data-slot="instance-detail"]')?.getAttribute('data-muted')).toBe('true')
    await expect(canvas.queryByRole('button', { name: 'Tear down' })).toBeNull()
  },
}

/** Contract 09: Deploy prepends a Queued release that walks to Live. */
export const DeployWalksToLive: Story = {
  play: async ({ canvas }) => {
    const releases = await canvas.findByRole('region', { name: 'Releases' })
    await userEvent.click(within(releases).getByRole('button', { name: 'Deploy' }))

    await expect(await within(releases).findByText('Queued')).toBeVisible()
    await waitFor(() => expect(releases.querySelectorAll('[data-shape="solid"]')).toHaveLength(3), { timeout: 8_000 })
  },
}

/** Contract 09: extending the expiry updates the expiry text. */
export const ExtendExpiryUpdatesTheExpiry: Story = {
  parameters: on(INSTANCE_IDS.preview),
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Extend expiry' }))
    await userEvent.click(await within(canvasElement.ownerDocument.body).findByRole('menuitem', { name: '72h' }))

    await waitFor(() => expect(canvas.getByText('in 71h', { selector: '[data-slot="expiry-text"]' })).toBeVisible())
  },
}

/** A member sees no owning actions: no Deploy, Extend expiry or Tear down. */
export const MemberSeesNoOwningActions: Story = {
  parameters: on(INSTANCE_IDS.scratch),
  beforeEach: () => {
    localStorage.setItem('currentUser', JSON.stringify(makeUser({ role: UserRole.OrgMember })))
    return () => localStorage.setItem('currentUser', JSON.stringify(makeUser()))
  },
  play: async ({ canvas }) => {
    const releases = await canvas.findByRole('region', { name: 'Releases' })
    await expect(within(releases).queryByRole('button', { name: 'Deploy' })).toBeNull()
    await expect(canvas.queryByRole('button', { name: 'Extend expiry' })).toBeNull()
    await expect(canvas.queryByRole('button', { name: 'Tear down' })).toBeNull()
  },
}

/** Contract 09: Tear down asks at ask width, then the header reads Torn down. */
export const TearDownAsksFirst: Story = {
  parameters: on(INSTANCE_IDS.scratch),
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Tear down' }))
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('alertdialog')
    await expect(dialog).toHaveTextContent('billing')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tear down' }))

    await expect(await canvas.findByText('Torn down', { selector: STATUS_PILL })).toBeVisible()
  },
}
