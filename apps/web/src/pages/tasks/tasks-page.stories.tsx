import type { Meta, StoryObj } from '@storybook/react-vite'
import { CoarseStatus, TaskPhase } from '@stackbox/contract'
import { delay, http, HttpResponse } from 'msw'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { withConfirm, withCurrentUser, withSheetHeader, withTasks } from '../../../.storybook/decorators'
import { APPLICATIONS, TASK_SUMMARIES } from '../../../.storybook/fixtures'
import { baselineHandlers } from '../../../.storybook/msw-handlers'
import { taskHandlers } from '@/preview/handlers/tasks'
import { ROUTES } from '@/lib/routes'
import { TasksPage } from './tasks-page'

const rowsIn = (canvasElement: HTMLElement) => canvasElement.querySelectorAll('[data-slot="data-list-row"]')

const meta = {
  title: 'Pages/Tasks',
  component: TasksPage,
  tags: ['ai-generated'],
  decorators: [withSheetHeader, withConfirm, withTasks, withCurrentUser],
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: [ROUTES.tasks] },
    msw: [...taskHandlers(TASK_SUMMARIES, APPLICATIONS), ...baselineHandlers],
  },
} satisfies Meta<typeof TasksPage>

export default meta
type Story = StoryObj<typeof meta>

/** State 1: eight rows covering every coarse status, Needs you on top. */
export const Populated: Story = {}

/** State 2: no tasks ever, with applications to run one against. */
export const Empty: Story = {
  parameters: { msw: [...taskHandlers([], APPLICATIONS), ...baselineHandlers] },
}

/** State 2, no applications: the action points at connecting one. */
export const EmptyWithoutApplications: Story = {
  parameters: { msw: [...taskHandlers([], []), ...baselineHandlers] },
}

/** State 3: filtered to Needs you, one result. */
export const FilteredToNeedsYou: Story = {
  parameters: {
    msw: [
      ...taskHandlers(
        TASK_SUMMARIES.map((row) =>
          row.id === 'task-2'
            ? { ...row, phase: TaskPhase.Implementing, coarse_status: CoarseStatus.Running, blocking_question: null }
            : row,
        ),
        APPLICATIONS,
      ),
      ...baselineHandlers,
    ],
  },
  play: async ({ canvasElement, canvas }) => {
    await userEvent.click(await canvas.findByRole('radio', { name: 'Needs you' }))
    await waitFor(() => expect(rowsIn(canvasElement)).toHaveLength(1))
  },
}

/** State 4: a filter that matches nothing, distinct from the true empty state. */
export const FilterMatchesNothing: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByRole('searchbox', { name: 'Search tasks' }), 'no such task')
    await expect(await canvas.findByText('No tasks match')).toBeVisible()
  },
}

/** State 5: the loading skeleton, five rows. */
export const Loading: Story = {
  parameters: {
    msw: [
      http.get('*/api/v1/organizations/:orgId/tasks', async () => {
        await delay('infinite')
        return HttpResponse.json(null)
      }),
      ...baselineHandlers,
    ],
  },
}

/** Interaction contract 02: Cancel asks first, then the row reads Cancelled. */
export const CancelAsksBeforeCancelling: Story = {
  parameters: { msw: [...taskHandlers(TASK_SUMMARIES, APPLICATIONS), ...baselineHandlers] },
  play: async ({ canvas }) => {
    const title = 'Search returns nothing for accented names'
    await userEvent.click(await canvas.findByRole('button', { name: `Cancel ${title}` }))
    await userEvent.click(await within(document.body).findByRole('button', { name: 'Cancel task' }))
    await waitFor(() => expect(canvas.getByRole('link', { name: title })).toHaveTextContent('Cancelled'))
  },
}
