// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { StackfileSync } from '@stackbox/contract'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ORG_ID, PREVIEW_CATALOG_SEED } from '../../.storybook/fixtures'
import { catalogHandlers } from '@/preview/handlers/catalog'
import { useApplications } from './use-applications'

const server = setupServer()

async function loaded() {
  const hook = renderHook(() => useApplications(ORG_ID))
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

describe('useApplications', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())
  beforeEach(() => server.resetHandlers(...catalogHandlers(PREVIEW_CATALOG_SEED, { delayMs: 0 })))

  it('maps the applications by name with their Stackfile sync and task counts', async () => {
    const { result } = await loaded()

    expect(result.current.applications.map((application) => [application.name, application.sync.status, application.tasksLabel])).toEqual([
      ['billing', StackfileSync.Stale, '3 tasks'],
      ['ledger', StackfileSync.ValidationFailed, '0 tasks'],
      ['shop', StackfileSync.Synced, '5 tasks'],
    ])
  })

  it('detects the services of a Stackfile named stackfile.yaml against the chosen repository', async () => {
    const { result } = await loaded()

    const detection = await act(async () => result.current.detect({ repositoryId: 'repo-design-system', repositoryFullName: 'acme/design-system', stackfilePath: null }))

    expect([detection.error, detection.services.map((service) => service.source)]).toEqual([
      null,
      ['acme/design-system/apps/api', 'acme/design-system/apps/web', 'postgres:17'],
    ])
  })

  it('creates an application that appears on the next refresh', async () => {
    const { result } = await loaded()

    const id = await act(async () => {
      const created = await result.current.create({ name: 'design-system', slug: 'design-system', repositoryId: 'repo-design-system', stackfilePath: null })
      await result.current.refresh()
      return created
    })

    expect([id, result.current.applications.map((application) => application.name)]).toEqual(['app-design-system', ['billing', 'design-system', 'ledger', 'shop']])
  })
})
