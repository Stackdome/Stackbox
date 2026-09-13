import { http, HttpResponse } from 'msw'
import { APPLICATIONS, TASK_SUMMARIES } from '../../.storybook/fixtures'
import { baselineHandlers } from '../../.storybook/msw-handlers'
import { taskHandlers } from './handlers/tasks'

export const scenario = import.meta.env.VITE_PREVIEW_SCENARIO

const EMPTY_SCENARIO = 'empty'

// MSW answers with the first match, and the baseline already carries populated tasks, so the scenario goes first.
export const previewHandlers = [
  ...(scenario === EMPTY_SCENARIO ? taskHandlers([], []) : taskHandlers(TASK_SUMMARIES, APPLICATIONS)),
  ...baselineHandlers,
  http.all('/api/v1/*', () => HttpResponse.json({ items: [], total: 0 })),
]
