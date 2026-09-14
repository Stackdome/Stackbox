// @vitest-environment jsdom
import { RepoProvider } from '@stackbox/contract'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ORG_ID } from '../../../.storybook/fixtures'
import { buildCatalog, PreviewCatalog, type CatalogSeed } from './catalog'
import { PreviewTaskBook } from './task-detail'
import { taskHandlers } from './tasks'

const REPOSITORY_ID = 'repo-design-system'

const SEED: CatalogSeed = {
  connections: [],
  repositories: [
    {
      id: REPOSITORY_ID,
      connection_id: 'connection-acme',
      provider: RepoProvider.Github,
      external_id: 'gh-1',
      full_name: 'acme/design-system',
      default_branch: 'main',
      created_at: '2026-07-21T09:00:00Z',
    },
  ],
  catalogue: {},
  applications: [],
  tasks: [],
}

describe('the preview catalog and task handlers sharing one task book', () => {
  const taskBook = new PreviewTaskBook([], [])
  const { catalog, handlers: catalogHandlers } = buildCatalog(SEED, { delayMs: 0, taskBook })
  const server = setupServer(...catalogHandlers, ...taskHandlers(taskBook, (id) => catalog.applicationSummary(id)))

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())

  it('blocks disconnecting a catalog-created application that has an active task', async () => {
    const created = await fetch(`/api/v1/organizations/${ORG_ID}/applications`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'design-system', slug: 'design-system', repository_id: REPOSITORY_ID, stackfile_path: null }),
    }).then((response) => response.json())

    const taskResponse = await fetch(`/api/v1/organizations/${ORG_ID}/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ application_id: created.id, description: 'Search is broken' }),
    })
    expect(taskResponse.status).toBe(201)

    const disconnect = await fetch(`/api/v1/organizations/${ORG_ID}/applications/${created.id}`, { method: 'DELETE' })

    expect(disconnect.status).toBe(409)
  })
})

describe('the preview catalog against a blocked sessionStorage', () => {
  const throwing: Storage = {
    length: 0,
    clear: () => {},
    key: () => null,
    getItem: () => {
      throw new Error('sessionStorage is blocked')
    },
    setItem: () => {
      throw new Error('sessionStorage is blocked')
    },
    removeItem: () => {},
  }

  it('falls back to the seed instead of taking the whole preview down', () => {
    const original = window.sessionStorage
    Object.defineProperty(window, 'sessionStorage', { value: throwing, configurable: true })

    try {
      const catalog = new PreviewCatalog(SEED, 'stackbox.preview.catalog.v1.test')

      expect(() => catalog.repositories()).not.toThrow()
      expect(catalog.repositories().map((row) => row.id)).toEqual([REPOSITORY_ID])
    } finally {
      Object.defineProperty(window, 'sessionStorage', { value: original, configurable: true })
    }
  })
})
