import { http, HttpResponse } from 'msw'
import { EMPTY_ACCOUNTS_SEED, EMPTY_CATALOG_SEED, PREVIEW_ACCOUNTS_SEED, PREVIEW_CATALOG_SEED, TASK_DETAILS, TASK_SUMMARIES } from '../../.storybook/fixtures'
import { baselineHandlers } from '../../.storybook/msw-handlers'
import { PreviewAccounts, accountHandlers, sessionGate } from './handlers/accounts'
import { buildCatalog } from './handlers/catalog'
import { PreviewTaskBook } from './handlers/task-detail'
import { taskHandlers } from './handlers/tasks'

export const scenario = import.meta.env.VITE_PREVIEW_SCENARIO

const EMPTY_SCENARIO = 'empty'

// Survives a reload of the same tab; every new browser context starts from the seed, signed in.
// Versioned so a fixture change starts fresh instead of parsing a stored shape it no longer matches.
const PERSIST_KEY = `stackbox.preview.catalog.v3.${scenario ?? 'populated'}`

const empty = scenario === EMPTY_SCENARIO
const seed = empty ? EMPTY_CATALOG_SEED : PREVIEW_CATALOG_SEED
const taskBook = new PreviewTaskBook(empty ? [] : TASK_SUMMARIES, empty ? [] : TASK_DETAILS)
const { catalog, handlers: catalogHdls } = buildCatalog(seed, { persistKey: PERSIST_KEY, taskBook })
const accounts = new PreviewAccounts(empty ? EMPTY_ACCOUNTS_SEED : PREVIEW_ACCOUNTS_SEED, `${PERSIST_KEY}.accounts`)

// MSW answers with the first match: the session gate refuses everything but the public routes while signed out,
// the accounts own the session and the organization, the catalog owns /applications, and the scenario's tasks go before the baseline's populated ones.
export const previewHandlers = [
  sessionGate(accounts),
  ...accountHandlers(accounts),
  ...catalogHdls,
  ...taskHandlers(taskBook, (applicationId) => catalog.applicationSummary(applicationId)),
  ...baselineHandlers,
  http.all('/api/v1/*', () => HttpResponse.json({ items: [], total: 0 })),
]
