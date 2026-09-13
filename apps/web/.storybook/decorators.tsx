import type { Decorator } from '@storybook/react-vite'
import { ConfirmProvider } from '../src/components/branded/confirm'

export const withConfirm: Decorator = (Story) => (
  <ConfirmProvider>
    <Story />
  </ConfirmProvider>
)

export const withHeight = (px: number): Decorator =>
  function HeightDecorator(Story) {
    return (
      <div style={{ height: px }}>
        <Story />
      </div>
    )
  }
