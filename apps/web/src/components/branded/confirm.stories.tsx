import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor, within } from 'storybook/test'
import { Button } from '@/components/ui/button'
import { ConfirmProvider, useConfirm, type ConfirmOptions } from './confirm'

/** Opens the dialog on mount-click so a play function has something to drive. */
function Trigger({ opts, label = 'Delete' }: { opts: ConfirmOptions; label?: string }) {
  const confirm = useConfirm()
  return (
    <Button variant="destructive" shape="flat" onClick={() => void confirm(opts)}>
      {label}
    </Button>
  )
}

const meta = {
  title: 'Branded/ConfirmDialog',
  component: Trigger,
  decorators: [
    (Story) => (
      <ConfirmProvider>
        <Story />
      </ConfirmProvider>
    ),
  ],
  args: { opts: { title: 'Delete?' } },
} satisfies Meta<typeof Trigger>

export default meta
type Story = StoryObj<typeof meta>

/** §6a level 1: reversible or cheap. Red button, live immediately. */
export const Level1Confirm: Story = {
  args: {
    opts: {
      title: 'Remove this domain?',
      description: 'The domain stops routing to this instance. You can add it back at any time.',
      confirmLabel: 'Remove',
      variant: 'destructive',
    },
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }))
    const body = within(canvasElement.ownerDocument.body)
    const commit = await body.findByRole('button', { name: 'Remove' })
    // No gate: live on arrival.
    await expect(commit).toBeEnabled()
  },
}

/** §6a level 2: destroys something rebuildable. A checkbox must be ticked
 *  before the red button goes live. */
export const Level2Acknowledge: Story = {
  args: {
    opts: {
      title: 'Delete this API key?',
      description: 'All requests using this key will start failing as soon as it is deleted.',
      confirmLabel: 'Delete key',
      variant: 'destructive',
      gate: { kind: 'acknowledge', label: 'I understand that services using this key will break.' },
    },
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }))
    const body = within(canvasElement.ownerDocument.body)
    const commit = await body.findByRole('button', { name: 'Delete key' })

    // Rendered DISABLED, not hidden: the cost must be visible before it is
    // payable, and the shape must survive being switched off. waitFor because
    // Radix fades the panel in; an immediate read catches opacity mid-flight.
    await waitFor(async () => {
      await expect(commit).toBeVisible()
    })
    await expect(commit).toBeDisabled()

    await userEvent.click(body.getByRole('checkbox'))
    await expect(commit).toBeEnabled()
  },
}

/** §6a level 3: has dependents or data. The name has to be typed. */
export const Level3Retype: Story = {
  args: {
    opts: {
      title: 'Delete payments-gateway?',
      description:
        'Every service in this instance stops and its containers, volumes and routes are torn down. Any traffic still pointed at it starts failing immediately.',
      confirmLabel: 'Delete instance',
      variant: 'destructive',
      gate: { kind: 'retype', name: 'payments-gateway' },
    },
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }))
    const body = within(canvasElement.ownerDocument.body)
    const commit = await body.findByRole('button', { name: 'Delete instance' })
    const field = body.getByLabelText(/type .* to confirm/i)

    await expect(commit).toBeDisabled()

    // A near miss is still a miss.
    await userEvent.type(field, 'payments-gatewa')
    await expect(commit).toBeDisabled()

    await userEvent.type(field, 'y')
    await expect(commit).toBeEnabled()
  },
}

/** The master plan's second test: the retype gate refuses the commit until the
 *  typed text matches the name exactly, checked against the dialog role and
 *  the input's implicit textbox role rather than a label lookup. */
export const RetypeRefusesUntilThePhraseMatches: Story = {
  args: {
    label: 'Tear down checkout-web',
    opts: {
      title: 'Tear down checkout-web?',
      description: 'Every service in this instance stops and its containers, volumes and routes are torn down.',
      confirmLabel: 'Tear down',
      variant: 'destructive',
      gate: { kind: 'retype', name: 'checkout-web' },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Tear down checkout-web' }))
    const dialog = within(document.body).getByRole('alertdialog')
    const confirm = within(dialog).getByRole('button', { name: 'Tear down' })
    await expect(confirm).toBeDisabled()
    await userEvent.type(within(dialog).getByRole('textbox'), 'checkout-we')
    await expect(confirm).toBeDisabled()
    await userEvent.type(within(dialog).getByRole('textbox'), 'b')
    await expect(confirm).toBeEnabled()
  },
}

/** The gate never survives into the next dialog: a ticked box from the last
 *  thing you deleted must not pre-arm the next one. */
export const GateResetsBetweenDialogs: Story = {
  args: {
    opts: {
      title: 'Tear down this Application Instance?',
      description: 'The instance and everything deployed into it are torn down.',
      confirmLabel: 'Tear down',
      variant: 'destructive',
      gate: { kind: 'acknowledge', label: 'I understand this instance will be destroyed.' },
    },
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const body = within(canvasElement.ownerDocument.body)
    const open = canvas.getByRole('button', { name: 'Delete' })

    // The dialog fades in, so settle on the panel before driving it. The
    // checkbox input is deliberately transparent (the styled box is the
    // paint), so it is the commit button that reports the panel has arrived.
    const settled = async () => {
      await waitFor(async () => {
        await expect(await body.findByRole('button', { name: 'Tear down' })).toBeVisible()
      })
      return body.getByRole('button', { name: 'Tear down' })
    }

    await userEvent.click(open)
    let commit = await settled()
    await expect(commit).toBeDisabled()
    await userEvent.click(body.getByRole('checkbox'))
    await expect(commit).toBeEnabled()

    // Cancel, reopen: the box is clear and the button is dead again.
    await userEvent.click(body.getByRole('button', { name: 'Cancel' }))
    await waitFor(async () => {
      await expect(body.queryByRole('checkbox')).toBeNull()
    })
    await userEvent.click(open)
    commit = await settled()
    await expect(body.getByRole('checkbox')).not.toBeChecked()
    await expect(commit).toBeDisabled()
  },
}

/** §6a: the red button sits LAST, after Cancel, and it is a red FILL rather
 *  than a red outline or red text. Both buttons are `flat`: destroying is
 *  work, not a commitment. */
export const FooterRanking: Story = {
  args: {
    opts: {
      title: 'Delete this service?',
      description: 'The database and every backup taken from it are removed.',
      confirmLabel: 'Delete service',
      variant: 'destructive',
    },
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }))
    const body = within(canvasElement.ownerDocument.body)
    const commit = await body.findByRole('button', { name: 'Delete service' })
    const cancel = body.getByRole('button', { name: 'Cancel' })

    // Last position.
    await expect(cancel.compareDocumentPosition(commit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    // Red fill, not a red outline: the background is the danger token and the
    // label is not.
    const probe = document.createElement('div')
    probe.className = 'bg-danger'
    document.body.appendChild(probe)
    const danger = getComputedStyle(probe).backgroundColor
    probe.remove()
    await expect(getComputedStyle(commit).backgroundColor).toBe(danger)

    // `flat`, so the radius comes off the height ladder, not a pill.
    for (const btn of [commit, cancel]) {
      const style = getComputedStyle(btn)
      await expect(parseFloat(style.borderRadius)).toBe(8)
      await expect(parseFloat(style.height)).toBe(32)
    }
  },
}

/** Cancel must not resolve the dialog false while the in-dialog action is
 *  still running: a click landing between the request and its answer would
 *  otherwise let the delete proceed on a page that already navigated away. */
export const CancelDisabledWhileRunning: Story = {
  args: {
    opts: {
      title: 'Disconnect shop?',
      description: 'Its services, tasks and their evidence are deleted.',
      confirmLabel: 'Disconnect application',
      variant: 'destructive',
      gate: { kind: 'retype', name: 'shop' },
      onConfirm: () => new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 200)),
    },
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }))
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.type(await body.findByLabelText('Type shop to confirm'), 'shop')

    await userEvent.click(body.getByRole('button', { name: 'Disconnect application' }))

    const cancel = body.getByRole('button', { name: 'Cancel' })
    await expect(cancel).toBeDisabled()

    await userEvent.click(cancel)
    await expect(body.getByRole('alertdialog')).toBeVisible()

    await waitFor(async () => {
      await expect(body.queryByRole('alertdialog')).toBeNull()
    })
  },
}

/** A retype confirm whose action the server refuses: the reason stays in the dialog, which stays open. */
export const RetypeRefusedByTheServer: Story = {
  args: {
    opts: {
      title: 'Disconnect shop?',
      description: 'Its services, tasks and their evidence are deleted.',
      confirmLabel: 'Disconnect application',
      variant: 'destructive',
      gate: { kind: 'retype', name: 'shop' },
      onConfirm: async () => "Cancel or finish this application's running tasks first",
    },
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }))
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.type(await body.findByLabelText('Type shop to confirm'), 'shop')

    await userEvent.click(body.getByRole('button', { name: 'Disconnect application' }))

    await expect(await body.findByText("Cancel or finish this application's running tasks first")).toBeVisible()
    await expect(body.getByRole('alertdialog')).toBeVisible()
  },
}
