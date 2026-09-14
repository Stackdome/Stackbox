import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { withConfirm, withCurrentUser, withSheetHeader, withTasks } from '../../../.storybook/decorators'
import { APPLICATIONS, TASK_DETAILS, TASK_SUMMARIES } from '../../../.storybook/fixtures'
import { baselineHandlers } from '../../../.storybook/msw-handlers'
import { taskHandlers } from '@/preview/handlers/tasks'
import { ROUTES } from '@/lib/routes'
import { TaskDetailPage } from './task-detail-page'

const meta = {
  title: 'Pages/TaskDetail',
  component: TaskDetailPage,
  tags: ['ai-generated'],
  decorators: [withSheetHeader, withConfirm, withTasks, withCurrentUser],
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: ['/tasks/task-1'], path: ROUTES.task },
    msw: [...taskHandlers(TASK_SUMMARIES, APPLICATIONS, TASK_DETAILS), ...baselineHandlers],
  },
} satisfies Meta<typeof TaskDetailPage>

export default meta
type Story = StoryObj<typeof meta>

/** Sending clears the banner, appends the reply and moves the stepper off Needs input. */
export const ReplyResumesTheTask: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByRole('textbox', { name: 'Reply to the agent' }), 'Safari 17.4 on macOS 14.')
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(canvas.queryByRole('textbox', { name: 'Reply to the agent' })).toBeNull())
    await expect(canvas.getByText('Implementing').closest('[data-status]')?.getAttribute('data-status')).toBe('active')
    await userEvent.click(canvas.getByRole('tab', { name: 'Conversation' }))
    await expect(canvas.getByText('Safari 17.4 on macOS 14.')).toBeVisible()
  },
}

/** Task 1 runs against a ready Application Instance, linked from the rail with its status. */
export const InstanceLinkOnTheRail: Story = {
  play: async ({ canvas }) => {
    const rail = await canvas.findByRole('region', { name: 'Application Instance' })

    await expect(within(rail).getByRole('link', { name: 'task 7c3e' })).toBeVisible()
    await expect(rail).toHaveTextContent('Ready')
  },
}
