import type { Meta, StoryObj } from '@storybook/react-vite'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible'
import { Button } from './button'

const meta = {
  title: 'Primitives/Collapsible',
  component: Collapsible,
  tags: ['ai-generated'],
} satisfies Meta<typeof Collapsible>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Collapsible className="w-80">
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm">
          Show run details
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 text-sm text-fg-2">
        Run started against orders-api on branch fix/auth-timeout.
      </CollapsibleContent>
    </Collapsible>
  ),
}

export const OpenByDefault: Story = {
  render: () => (
    <Collapsible defaultOpen className="w-80">
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm">
          Hide check output
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 text-sm text-fg-2">
        All checks passed for the billing-worker instance.
      </CollapsibleContent>
    </Collapsible>
  ),
}
