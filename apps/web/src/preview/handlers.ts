import { http, HttpResponse } from 'msw'
import { EMPTY_CATALOG_SEED, PREVIEW_APPLICATION_SUMMARIES, PREVIEW_CATALOG_SEED, TASK_DETAILS, TASK_SUMMARIES } from '../../.storybook/fixtures'
import { baselineHandlers } from '../../.storybook/msw-handlers'
import { catalogHandlers } from './handlers/catalog'
import { taskHandlers } from './handlers/tasks'

export const scenario = import.meta.env.VITE_PREVIEW_SCENARIO

const EMPTY_SCENARIO = 'empty'

// Survives a reload of the same tab; every new browser context starts from the seed.
const PERSIST_KEY = `stackbox.preview.catalog.${scenario ?? 'populated'}`

// MSW answers with the first match: the catalog owns /applications, and the scenario's tasks go before the baseline's populated ones.
export const previewHandlers = [
  ...(scenario === EMPTY_SCENARIO
    ? [...catalogHandlers(EMPTY_CATALOG_SEED, { persistKey: PERSIST_KEY }), ...taskHandlers([], [])]
    : [...catalogHandlers(PREVIEW_CATALOG_SEED, { persistKey: PERSIST_KEY }), ...taskHandlers(TASK_SUMMARIES, PREVIEW_APPLICATION_SUMMARIES, TASK_DETAILS)]),
  ...baselineHandlers,
  http.all('/api/v1/*', () => HttpResponse.json({ items: [], total: 0 })),
]
