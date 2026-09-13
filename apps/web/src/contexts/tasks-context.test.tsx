// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { CoarseStatus } from '@stackbox/contract'
import { setupServer } from 'msw/node'
import type { ReactNode } from 'react'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APPLICATIONS, TASK_SUMMARIES, makeUser } from '../../.storybook/fixtures'
import { useTasks } from '@/hooks/use-tasks'
import { taskHandlers } from '@/preview/handlers/tasks'
import { CurrentUserProvider } from './current-user-context'
import { TasksProvider } from './tasks-context'

const server = setupServer()

function wrapper({ children }: { children: ReactNode }) {
  return (
    <CurrentUserProvider>
      <TasksProvider>{children}</TasksProvider>
    </CurrentUserProvider>
  )
}

describe('TasksProvider', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())
  beforeEach(() => {
    localStorage.setItem('currentUser', JSON.stringify(makeUser()))
    server.resetHandlers(...taskHandlers(TASK_SUMMARIES, APPLICATIONS))
  })

  it('counts the tasks that need you from the list the API answers', async () => {
    const { result } = renderHook(() => useTasks(), { wrapper })

    await waitFor(() => expect(result.current.needsYouCount).toBe(2))
  })

  it('shows a cancelled task as cancelled once the list reloads', async () => {
    const { result } = renderHook(() => useTasks(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(() => result.current.cancel('task-3'))

    expect(result.current.tasks.find((task) => task.id === 'task-3')?.status).toBe(CoarseStatus.Cancelled)
  })
})
