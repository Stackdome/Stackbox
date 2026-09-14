// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { TaskPhase } from '@stackbox/contract'
import { http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { APPLICATIONS, ORG_ID, TASK_DETAILS, TASK_SUMMARIES } from '../../.storybook/fixtures'
import { taskHandlers } from '@/preview/handlers/tasks'
import { TASK_DETAIL_REFRESH_MS, useTaskDetail } from './use-task-detail'

const server = setupServer()

describe('useTaskDetail', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())
  beforeEach(() => server.resetHandlers(...taskHandlers(TASK_SUMMARIES, APPLICATIONS, TASK_DETAILS)))
  afterEach(() => vi.useRealTimers())

  it('maps the detail, timeline, checks, runs and conversation of a task', async () => {
    const { result } = renderHook(() => useTaskDetail(ORG_ID, 'task-2'))

    await waitFor(() => expect(result.current.data).not.toBeNull())

    expect({
      diverted: result.current.data?.detail.divertedFrom,
      timeline: result.current.data?.timeline.length,
      checks: result.current.data?.checks.map((check) => check.line),
      runs: result.current.data?.runs.map((run) => run.outcomeLabel),
      waiting: result.current.data?.messages.filter((message) => message.waiting).length,
    }).toEqual({
      diverted: TaskPhase.Verifying,
      timeline: 9,
      checks: ['Instance ready: passed', 'Reproduced: passed', 'Fix verified: failed'],
      runs: ['Failed', 'In flight'],
      waiting: 1,
    })
  })

  it('moves the task back to the phase it diverted from once the reply is sent', async () => {
    const { result } = renderHook(() => useTaskDetail(ORG_ID, 'task-1'))
    await waitFor(() => expect(result.current.data).not.toBeNull())

    await act(() => result.current.reply('Safari 17.4 on macOS 14.'))

    expect({
      phase: result.current.data?.detail.phase,
      question: result.current.data?.detail.blockingQuestion,
      last: result.current.data?.messages.at(-1)?.body,
    }).toEqual({ phase: TaskPhase.Implementing, question: null, last: 'Safari 17.4 on macOS 14.' })
  })

  it('reads the task again every five seconds while the tab is visible', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let reads = 0
    server.events.on('request:start', ({ request }) => {
      if (new URL(request.url).pathname.endsWith('/tasks/task-3')) reads += 1
    })
    const { result } = renderHook(() => useTaskDetail(ORG_ID, 'task-3'))
    await waitFor(() => expect(result.current.data).not.toBeNull())

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TASK_DETAIL_REFRESH_MS * 2)
    })

    await waitFor(() => expect(reads).toBe(3))
    server.events.removeAllListeners()
  })

  it('reports a failed load and keeps nothing', async () => {
    server.use(http.get('*/api/v1/organizations/:orgId/tasks/:taskId', () => Response.error()))
    const { result } = renderHook(() => useTaskDetail(ORG_ID, 'task-1'))

    await waitFor(() => expect(result.current.failed).toBe(true))

    expect(result.current.data).toBeNull()
  })
})
