import type { Meta, StoryObj } from '@storybook/react-vite'
import { Alert, AlertDescription, AlertTitle } from './alert'

const meta = {
  title: 'Primitives/Alert',
  component: Alert,
  tags: ['ai-generated'],
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Alert className="w-96">
      <AlertTitle>Stackfile detected</AlertTitle>
      <AlertDescription>orders-api will spin up from the Stackfile at the repository root.</AlertDescription>
    </Alert>
  ),
}

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive" className="w-96">
      <AlertTitle>Budget exceeded</AlertTitle>
      <AlertDescription>The organization budget is exhausted. Raise the budget to start new tasks.</AlertDescription>
    </Alert>
  ),
}
