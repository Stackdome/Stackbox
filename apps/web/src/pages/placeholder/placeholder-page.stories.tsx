import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { PlaceholderPage } from './placeholder-page'

const meta: Meta<typeof PlaceholderPage> = {
  title: 'Pages/Placeholder',
  component: PlaceholderPage,
  args: { title: 'Instances' },
}
export default meta

export const Default: StoryObj<typeof PlaceholderPage> = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole('heading', { name: 'Instances' }),
    ).toBeVisible()
  },
}
