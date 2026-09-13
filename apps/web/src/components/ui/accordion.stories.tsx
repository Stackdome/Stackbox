import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion'

const meta = {
  title: 'Primitives/Accordion',
  component: Accordion,
  tags: ['ai-generated'],
  args: { type: 'single' },
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-96">
      <AccordionItem value="orders-api">
        <AccordionTrigger>orders-api</AccordionTrigger>
        <AccordionContent>Repository connected to the orders-api application instance.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="billing-worker">
        <AccordionTrigger>billing-worker</AccordionTrigger>
        <AccordionContent>Repository connected to the billing-worker application instance.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const Multiple: Story = {
  render: () => (
    <Accordion type="multiple" className="w-96">
      <AccordionItem value="one">
        <AccordionTrigger>Repository access</AccordionTrigger>
        <AccordionContent>Read and write access to the connected repository.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="two">
        <AccordionTrigger>Instance budget</AccordionTrigger>
        <AccordionContent>Cost tracked and enforced at task and organization level.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const ExpandsOnClick: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-96">
      <AccordionItem value="orders-api">
        <AccordionTrigger>orders-api</AccordionTrigger>
        <AccordionContent>Repository connected to the orders-api application instance.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'orders-api' })
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  },
}
