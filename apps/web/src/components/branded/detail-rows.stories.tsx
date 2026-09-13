import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { DetailList, DetailRow } from './detail-rows'

const meta = {
  title: 'Branded/DetailRows',
  component: DetailList,
} satisfies Meta<typeof DetailList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: null },
  render: () => (
    <DetailList className="w-[360px]">
      <DetailRow label="Host">orders-api.example.com</DetailRow>
      <DetailRow label="Branch">main</DetailRow>
      <DetailRow label="Region">us-east-1</DetailRow>
    </DetailList>
  ),
}

// An absent fact closes the group rather than rendering a row with a dash.
export const AbsentFactIsOmitted: Story = {
  args: { children: null },
  render: () => (
    <DetailList className="w-[360px]">
      <DetailRow label="Host">orders-api.example.com</DetailRow>
      <DetailRow label="Branch">{undefined}</DetailRow>
      <DetailRow label="Region">us-east-1</DetailRow>
    </DetailList>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.queryByText('Branch')).toBeNull()
    await expect(canvas.getAllByRole('term')).toHaveLength(2)
  },
}

export const RoundedValueWithExactTitle: Story = {
  args: { children: null },
  render: () => (
    <DetailList className="w-[360px]">
      <DetailRow label="Deployed" title="2026-07-30T12:00:41Z">
        5m ago
      </DetailRow>
    </DetailList>
  ),
  play: async ({ canvas }) => {
    const value = canvas.getByText('5m ago').closest('dd')
    await expect(value).toHaveAttribute('title', '2026-07-30T12:00:41Z')
  },
}
