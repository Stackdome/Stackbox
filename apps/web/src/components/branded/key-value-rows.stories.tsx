import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { KeyValueRows, type KeyValueRow } from './key-value-rows'

function KeyValueRowsDemo({ initial }: { initial: KeyValueRow[] }) {
  const [rows, setRows] = useState<KeyValueRow[]>(initial)
  return (
    <div className="w-[440px]">
      <KeyValueRows
        rows={rows}
        onChange={setRows}
        addLabel="Add variable"
        makeRow={() => ({ key: '', value: '' })}
        emptyTitle="No variables"
        emptyHint="Passed to every process at start."
      />
    </div>
  )
}

const meta = {
  title: 'Branded/KeyValueRows',
  component: KeyValueRowsDemo,
} satisfies Meta<typeof KeyValueRowsDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {
  args: {
    initial: [
      { key: 'NODE_ENV', value: 'production' },
      { key: 'PORT', value: '8080' },
    ],
  },
}

export const Empty: Story = {
  args: { initial: [] },
}

// Clicking add appends a fresh, empty row to the list.
export const AddsARow: Story = {
  args: { initial: [{ key: 'NODE_ENV', value: 'production' }] },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getAllByLabelText('Key')).toHaveLength(1)
    await userEvent.click(canvas.getByRole('button', { name: 'Add variable' }))
    const keys = canvas.getAllByLabelText('Key')
    await expect(keys).toHaveLength(2)
    await expect(keys[1]).toHaveValue('')
  },
}
