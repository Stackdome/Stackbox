import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Disclosure } from './disclosure'

const meta = {
  title: 'Branded/Disclosure',
  component: Disclosure,
  args: {
    label: 'Advanced: build & push',
    children: (
      <div className="mt-2 flex flex-col gap-2">
        <Label htmlFor="build-arg">Build argument</Label>
        <Input id="build-arg" placeholder="NODE_ENV=production" />
      </div>
    ),
  },
} satisfies Meta<typeof Disclosure>

export default meta
type Story = StoryObj<typeof meta>

/** Closed by default: the chevron points right and the content is unmounted. */
export const Closed: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Advanced: build & push' })
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(canvas.queryByLabelText('Build argument')).toBeNull()
  },
}

/** A click turns the chevron and mounts the content: no swapped glyph. */
export const OpensOnClick: Story = {
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'Advanced: build & push' })
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(canvas.getByLabelText('Build argument')).toBeVisible()
  },
}

/** `defaultOpen` starts the group expanded, for a form re-opened on a field
 *  that failed validation inside it. */
export const DefaultOpen: Story = {
  args: { defaultOpen: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Build argument')).toBeVisible()
  },
}
