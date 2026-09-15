import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { PREVIEW_ORGANIZATION } from '../../../.storybook/fixtures'
import { toOrganization } from '@/api/mappers/organization'
import { GeneralForm } from './general-tab'

const meta = {
  title: 'Features/Settings/GeneralForm',
  component: GeneralForm,
  tags: ['ai-generated'],
  args: { organization: toOrganization(PREVIEW_ORGANIZATION), onSave: async () => {} },
} satisfies Meta<typeof GeneralForm>

export default meta
type Story = StoryObj<typeof meta>

/** R8: Save is the page's one filled button and stays quiet until the name or the budget changed. */
export const SaveWaitsForAChange: Story = {
  play: async ({ canvas }) => {
    const save = canvas.getByRole('button', { name: 'Save' })
    await expect(save).toBeDisabled()

    await userEvent.clear(canvas.getByLabelText(/^Monthly budget/))
    await userEvent.type(canvas.getByLabelText(/^Monthly budget/), '600')

    await expect(save).toBeEnabled()
  },
}

/** A blank name says so on the field and cannot be saved. */
export const BlankNameCannotSave: Story = {
  play: async ({ canvas }) => {
    await userEvent.clear(canvas.getByLabelText(/^Organization name/))

    await expect(canvas.getByText('Name the organization')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeDisabled()
  },
}
