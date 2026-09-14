import { http, HttpResponse } from 'msw'
import { EMPTY_CATALOG_SEED, PREVIEW_CATALOG_SEED, TASK_DETAILS, TASK_SUMMARIES } from '../../.storybook/fixtures'
import { baselineHandlers } from '../../.storybook/msw-handlers'
import { buildCatalog } from './handlers/catalog'
import { PreviewTaskBook } from './handlers/task-detail'
import { taskHandlers } from './handlers/tasks'

export const scenario = import.meta.env.VITE_PREVIEW_SCENARIO

const EMPTY_SCENARIO = 'empty'

// Survives a reload of the same tab; every new browser context starts from the seed.
// Versioned so a fixture change starts fresh instead of parsing a stored shape it no longer matches.
const PERSIST_KEY = `stackbox.preview.catalog.v2.${scenario ?? 'populated'}`

const seed = scenario === EMPTY_SCENARIO ? EMPTY_CATALOG_SEED : PREVIEW_CATALOG_SEED
const taskBook = new PreviewTaskBook(scenario === EMPTY_SCENARIO ? [] : TASK_SUMMARIES, scenario === EMPTY_SCENARIO ? [] : TASK_DETAILS)
const { catalog, handlers: catalogHdls } = buildCatalog(seed, { persistKey: PERSIST_KEY, taskBook })

// MSW answers with the first match: the catalog owns /applications, and the scenario's tasks go before the baseline's populated ones.
export const previewHandlers = [
  ...catalogHdls,
  ...taskHandlers(taskBook, (applicationId) => catalog.applicationSummary(applicationId)),
  ...baselineHandlers,
  http.all('/api/v1/*', () => HttpResponse.json({ items: [], total: 0 })),
]
