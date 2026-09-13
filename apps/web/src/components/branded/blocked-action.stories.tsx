import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor, within } from 'storybook/test'
import { Button } from '@/components/ui/button'
import { BlockedAction, reasonList } from './blocked-action'

const meta = {
  title: 'Branded/BlockedAction',
  component: BlockedAction,
} satisfies Meta<typeof BlockedAction>

export default meta
type Story = StoryObj<typeof meta>

const domainButton = <Button variant="outline">Add domain</Button>

/** No reason: the child renders exactly as passed, live. */
export const NotBlocked: Story = {
  args: { reason: null, children: domainButton },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Add domain' })).toBeEnabled()
  },
}

/** A reason disables the child and explains itself on hover and on focus: the
 *  tooltip anchors to the focusable wrapper, not the disabled button, since a
 *  disabled control swallows pointer events. */
export const Blocked: Story = {
  args: { reason: 'Only one domain is supported today', children: domainButton },
  play: async ({ canvas, canvasElement }) => {
    const trigger = canvas.getByRole('button', { name: 'Add domain' })
    await expect(trigger).toBeDisabled()

    const wrapper = canvasElement.querySelector('[tabindex="0"]') as HTMLElement
    wrapper.focus()
    const body = within(canvasElement.ownerDocument.body)
    await waitFor(async () => {
      await expect(body.getAllByText('Only one domain is supported today')[0]).toBeVisible()
    })
  },
}

/** Several missing things read as a list, not one run-together sentence. */
export const MultipleReasons: Story = {
  args: {
    reason: reasonList(['Enter a name', 'Enter a value']),
    children: domainButton,
  },
  play: async ({ canvas, canvasElement }) => {
    const wrapper = canvasElement.querySelector('[tabindex="0"]') as HTMLElement
    wrapper.focus()
    const body = within(canvasElement.ownerDocument.body)
    await waitFor(async () => {
      await expect(body.getByRole('list')).toBeVisible()
    })
    await expect(canvas.getByRole('button', { name: 'Add domain' })).toBeDisabled()
  },
}
