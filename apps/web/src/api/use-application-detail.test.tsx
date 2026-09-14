// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { StackfileSync } from '@stackbox/contract'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { APPLICATIONS, ORG_ID, PREVIEW_CATALOG_SEED, TASK_DETAILS, TASK_SUMMARIES } from '../../.storybook/fixtures'
import { catalogHandlers } from '@/preview/handlers/catalog'
import { taskHandlers } from '@/preview/handlers/tasks'
import { useApplicationDetail } from './use-application-detail'

const server = setupServer()

async function loaded(applicationId: string) {
  const hook = renderHook(() => useApplicationDetail(ORG_ID, applicationId))
  await waitFor(() => expect(hook.result.current.data).not.toBeNull())
  return hook
}

describe('useApplicationDetail', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())
  beforeEach(() =>
    server.resetHandlers(...catalogHandlers(PREVIEW_CATALOG_SEED, { delayMs: 0 }), ...taskHandlers(TASK_SUMMARIES, APPLICATIONS, TASK_DETAILS)),
  )

  it('loads the detail with the tasks of that application only', async () => {
    const { result } = await loaded('app-billing')

    expect([result.current.data?.detail.name, result.current.data?.tasks.map((task) => task.id)]).toEqual(['billing', ['task-2', 'task-4', 'task-7']])
  })

  it('clears the stale mark and reads the head sha once the re-sync lands', async () => {
    const { result } = await loaded('app-billing')

    await act(async () => {
      await result.current.sync()
    })

    expect([result.current.data?.detail.sync.status, result.current.data?.detail.syncedShaShort, result.current.syncing]).toEqual([
      StackfileSync.Synced,
      '9f8e7d6',
      false,
    ])
  })

  it('renames the application and reads the new name back', async () => {
    const { result } = await loaded('app-billing')

    await act(async () => {
      await result.current.rename('invoicing')
    })

    expect(result.current.data?.detail.name).toBe('invoicing')
  })
})
