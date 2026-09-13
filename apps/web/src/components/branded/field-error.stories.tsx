import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { FieldError } from './field-error'

const meta = {
  title: 'Branded/FieldError',
  component: FieldError,
} satisfies Meta<typeof FieldError>

export default meta
type Story = StoryObj<typeof meta>

export const WithMessage: Story = {
  args: { children: 'A service called orders-gateway already exists in this instance.' },
}

/** No children means no error to show, so the component renders nothing rather
 *  than an empty paragraph taking up a line. */
export const Empty: Story = {
  args: { children: undefined },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('p')).toBeNull()
  },
}
