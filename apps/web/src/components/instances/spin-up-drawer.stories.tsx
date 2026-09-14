import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { APPLICATION_DETAILS } from '../../../.storybook/fixtures'
import { LOAD_TEST_HINT, SpinUpDrawer } from './spin-up-drawer'

const applications = APPLICATION_DETAILS.map((detail) => ({ id: detail.id, name: detail.name, defaultBranch: detail.repository.default_branch }))
const shop = applications.filter((application) => application.id === 'app-shop')[0]

const meta = {
  title: 'Features/Instances/SpinUpDrawer',
  component: SpinUpDrawer,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    onOpenChange: () => {},
    applications,
    onSubmit: async () => {},
  },
} satisfies Meta<typeof SpinUpDrawer>

export default meta
type Story = StoryObj<typeof meta>

const drawerOf = async () => within(await within(document.body).findByRole('dialog', { name: 'Spin up application instance' }))

/** State 1: opened from the Instances list, nothing picked, Scratch for 72h. */
export const Blank: Story = {
  play: async () => {
    const drawer = await drawerOf()
    await expect(drawer.getByRole('radio', { name: 'Scratch' })).toBeChecked()
    await expect(drawer.getByRole('radio', { name: '72h' })).toBeChecked()
    await expect(drawer.getByRole('button', { name: 'Spin up' })).toBeDisabled()
  },
}

/** State 2: opened from an application, the application locked and the ref at its default branch. */
export const LockedToAnApplication: Story = {
  args: { initial: { application: shop, locked: true } },
  play: async () => {
    const drawer = await drawerOf()
    await expect(drawer.getByRole('combobox', { name: /Application/ })).toBeDisabled()
    await expect(drawer.getByRole('combobox', { name: /Application/ })).toHaveTextContent('shop')
    await expect(drawer.getByRole('textbox', { name: /Ref/ })).toHaveValue('main')
  },
}

/** State 3: Load test for 24h, with the one-line note about resources. */
export const LoadTestWith24h: Story = {
  args: { initial: { application: shop, locked: true } },
  play: async () => {
    const drawer = await drawerOf()
    await userEvent.click(drawer.getByRole('radio', { name: 'Load test' }))
    await userEvent.click(drawer.getByRole('radio', { name: '24h' }))

    await expect(drawer.getByText(LOAD_TEST_HINT)).toBeVisible()
    await expect(drawer.getByRole('radio', { name: '24h' })).toBeChecked()
  },
}

/** Contract 10: Persistent selects No expiry and disables the expiry control. */
export const PersistentHasNoExpiry: Story = {
  args: { initial: { application: shop, locked: true } },
  play: async () => {
    const drawer = await drawerOf()
    await userEvent.click(drawer.getByRole('radio', { name: 'Persistent' }))

    await expect(drawer.getByRole('radio', { name: 'No expiry' })).toBeChecked()
    await expect(drawer.getByRole('radio', { name: '24h' })).toBeDisabled()
  },
}

/** State 4: no application to spin up, so the drawer sends the person to connect one. */
export const NoApplications: Story = {
  args: { applications: [] },
  play: async () => {
    const drawer = await drawerOf()
    await expect(drawer.getByRole('link', { name: 'Connect an application first' })).toBeVisible()
    await expect(drawer.getByRole('button', { name: 'Spin up' })).toBeDisabled()
  },
}
