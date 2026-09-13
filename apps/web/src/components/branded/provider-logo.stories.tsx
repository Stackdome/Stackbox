import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { ProviderLogo } from './provider-logo'
import { BRAND_ICONS, type ProviderId } from './brand-icon-registry'

const meta = {
  title: 'Branded/ProviderLogo',
  component: ProviderLogo,
} satisfies Meta<typeof ProviderLogo>

export default meta
type Story = StoryObj<typeof meta>

const PROVIDER_IDS = Object.keys(BRAND_ICONS) as ProviderId[]

export const AllProviders: Story = {
  args: { providerId: 'docker' },
  render: () => (
    <div className="flex items-center gap-4">
      {PROVIDER_IDS.map((id) => (
        <ProviderLogo key={id} providerId={id} className="size-6" />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const images = canvasElement.querySelectorAll('img')
    await expect(images).toHaveLength(PROVIDER_IDS.length * 2)
  },
}
