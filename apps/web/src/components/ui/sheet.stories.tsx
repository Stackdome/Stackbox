import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet'
import { Button } from './button'

const meta = {
  title: 'Primitives/Sheet',
  component: Sheet,
  tags: ['ai-generated'],
} satisfies Meta<typeof Sheet>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Instance details</SheetTitle>
          <SheetDescription>A slice of the record, without leaving the page.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <Button variant="outline">Close</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
}

/**
 * The trigger renders inline, but the panel is portalled to the body: the
 * render alone proves nothing about it opening. Click through and assert the
 * portal actually mounted a dialog.
 */
export const OpensIntoAPortal: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Instance details</SheetTitle>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Open sheet' }))
    await waitFor(async () => {
      await expect(within(document.body).getByRole('dialog')).toBeVisible()
    })
  },
}

/** Rendered open with no play, so the themes sweep checks the panel's colours
 *  without simulating a click first. */
export const OpenForTheThemeSweep: Story = {
  render: () => (
    <Sheet defaultOpen>
      <SheetTrigger asChild>
        <Button variant="outline">Open sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Instance details</SheetTitle>
          <SheetDescription>A slice of the record, without leaving the page.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <Button variant="outline">Close</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
}
