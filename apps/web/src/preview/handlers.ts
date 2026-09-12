import { http, HttpResponse } from 'msw'
import { baselineHandlers } from '../../.storybook/msw-handlers'

// Slice 0 has no domain data, so every resource answers empty regardless of
// scenario. Exported so slice 1's per-resource handlers have this to branch
// on instead of reading the env var again.
export const scenario = import.meta.env.VITE_PREVIEW_SCENARIO

export const previewHandlers = [
  ...baselineHandlers,
  http.all('/api/v1/*', () => HttpResponse.json({ items: [], total: 0 })),
]
