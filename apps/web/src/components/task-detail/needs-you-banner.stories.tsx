import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { NeedsYouBanner } from './needs-you-banner'

const meta = {
  title: 'Features/TaskDetail/NeedsYouBanner',
  component: NeedsYouBanner,
  tags: ['ai-generated'],
  args: { question: 'Which Safari version shows the dead button?', onSend: async () => {} },
} satisfies Meta<typeof NeedsYouBanner>

export default meta
type Story = StoryObj<typeof meta>

export const Waiting: Story = {}

/** Send stays disabled until the reply has words in it. */
export const TypingEnablesSend: Story = {
  play: async ({ canvas }) => {
    const send = canvas.getByRole('button', { name: 'Send' })
    await expect(send).toBeDisabled()
    await userEvent.type(canvas.getByRole('textbox', { name: 'Reply to the agent' }), 'Safari 17.4')
    await expect(send).toBeEnabled()
  },
}
