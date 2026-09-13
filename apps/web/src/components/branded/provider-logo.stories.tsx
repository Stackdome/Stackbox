import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { ProviderLogo } from './provider-logo'

const meta = {
  title: 'Branded/ProviderLogo',
  component: ProviderLogo,
} satisfies Meta<typeof ProviderLogo>

export default meta
type Story = StoryObj<typeof meta>

export const AllProviders: Story = {
  args: { providerId: 'docker' },
  render: () => (
    <div className="flex items-center gap-4">
      <ProviderLogo providerId="docker" className="size-6" />
      <ProviderLogo providerId="github" className="size-6" />
      <ProviderLogo providerId="gitlab" className="size-6" />
      <ProviderLogo providerId="bitbucket" className="size-6" />
      <ProviderLogo providerId="gitea" className="size-6" />
    </div>
  ),
}

// An unregistered provider falls back to a generic branch glyph rather than
// rendering nothing.
export const UnknownProviderFallsBackToGlyph: Story = {
  args: { providerId: 'other' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('svg')).not.toBeNull()
    await expect(canvasElement.querySelector('img')).toBeNull()
  },
}
