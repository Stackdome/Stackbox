import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import {
  DataListActions,
  DataListCell,
  DataListHeader,
  DataListName,
  DataListRow,
  DataListSkeleton,
} from './data-list'

function ListDemo({ onActivate }: { onActivate?: boolean }) {
  return (
    <div className="w-[600px]">
      <DataListHeader columns="1fr 1fr auto" labels={['Name', 'Host', '']} />
      <DataListRow
        columns="1fr 1fr auto"
        onActivate={onActivate ? () => {} : undefined}
        label="orders-api"
      >
        <DataListName name="orders-api" secondary="a3f9d2e" />
        <DataListCell mono>orders-api.example.com</DataListCell>
        <DataListActions>
          <button type="button">Open</button>
        </DataListActions>
      </DataListRow>
      <DataListRow columns="1fr 1fr auto" onActivate={onActivate ? () => {} : undefined} label="billing-api">
        <DataListName name="billing-api" secondary="b7e1c40" />
        <DataListCell mono>billing-api.example.com</DataListCell>
        <DataListActions>
          <button type="button">Open</button>
        </DataListActions>
      </DataListRow>
    </div>
  )
}

const meta = {
  title: 'Branded/DataList',
  component: ListDemo,
} satisfies Meta<typeof ListDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: {} }

export const ActivatableRows: Story = {
  args: { onActivate: true },
  play: async ({ canvas }) => {
    const row = canvas.getByRole('link', { name: 'orders-api' })
    await expect(row).toHaveAttribute('tabIndex', '0')
  },
}

export const Skeleton: Story = {
  render: () => (
    <div className="w-[600px]">
      <DataListHeader columns="1fr 1fr auto" labels={['Name', 'Host', '']} />
      <DataListSkeleton
        columns="1fr 1fr auto"
        shape={[[{ w: 120, h: 4 }, { w: 80, h: 3 }], { w: 140, h: 3 }, null]}
        rows={3}
      />
    </div>
  ),
}
