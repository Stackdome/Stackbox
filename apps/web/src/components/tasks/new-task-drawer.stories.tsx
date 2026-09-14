import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { APPLICATIONS, makeArtifact } from '../../../.storybook/fixtures'
import { toApplication } from '@/api/mappers/application'
import { toArtifact } from '@/api/mappers/task-detail'
import { NewTaskDrawer } from './new-task-drawer'

const applications = APPLICATIONS.map(toApplication)

const meta = {
  title: 'Features/Tasks/NewTaskDrawer',
  component: NewTaskDrawer,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    onOpenChange: () => {},
    applications,
    reporterName: 'Ada Lovelace',
    onUpload: async () => toArtifact(makeArtifact()),
    onSubmit: async () => {},
  },
} satisfies Meta<typeof NewTaskDrawer>

export default meta
type Story = StoryObj<typeof meta>

/** State 1: opened from the Tasks list, no application picked. Opening the drawer focuses the Application field. */
export const Blank: Story = {
  play: async () => {
    const drawer = within(document.body)
    await expect(drawer.getByRole('combobox', { name: 'Application' })).toHaveFocus()
  },
}

/** State 2: opened from an application, picker locked, a screenshot already attached. */
export const FilledFromApplication: Story = {
  args: {
    lockedApplicationId: 'app-shop',
    initialDraft: {
      description: 'Checkout button does nothing on Safari',
      expectedBehaviour: 'Tapping Checkout opens the payment step.',
      screenshot: toArtifact(makeArtifact({ meta: { name: 'safari-checkout.png' } })),
    },
  },
}

/** State 3: Start task with no description shows the field error and the drawer stays open. */
export const DescriptionRequired: Story = {
  play: async () => {
    const drawer = within(document.body)
    await userEvent.click(drawer.getByRole('button', { name: 'Start task' }))
    await expect(drawer.getByText('Describe what went wrong')).toBeVisible()
    await expect(drawer.getByRole('dialog', { name: 'New task' })).toBeVisible()
  },
}

/** State 4: no applications, the body points at connecting one and the footer only closes. */
export const NoApplications: Story = {
  args: { applications: [] },
  play: async () => {
    const drawer = within(document.body)
    await expect(drawer.getByRole('link', { name: 'Connect an application first' })).toBeVisible()
    await expect(drawer.queryByRole('button', { name: 'Start task' })).toBeNull()
  },
}

/** State 5: the Advanced disclosure opens onto the target branch and run limit. */
export const AdvancedExpanded: Story = {
  play: async () => {
    const drawer = within(document.body)
    await userEvent.click(drawer.getByRole('button', { name: 'Advanced' }))
    await expect(drawer.getByLabelText('Run limit')).toHaveValue(2)
  },
}
