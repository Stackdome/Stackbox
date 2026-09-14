// @vitest-environment jsdom
import { ConnectionStatus, RepoProvider } from '@stackbox/contract'
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

describe('the preview catalog adding repositories', () => {
  const CONNECTION_ID = 'connection-acme'

  const seed: CatalogSeed = {
    connections: [
      { id: CONNECTION_ID, provider: RepoProvider.Github, account_login: 'acme', status: ConnectionStatus.Verified, repository_count: 1, created_at: '2026-07-20T09:00:00Z' },
    ],
    repositories: [
      { id: 'repo-shop', connection_id: CONNECTION_ID, provider: RepoProvider.Github, external_id: 'gh-1001', full_name: 'acme/shop', default_branch: 'main', created_at: '2026-07-21T09:00:00Z' },
    ],
    catalogue: {
      [CONNECTION_ID]: [
        { external_id: 'gh-1001', full_name: 'acme/shop', default_branch: 'main' },
        { external_id: 'gh-1002', full_name: 'acme/billing', default_branch: 'main' },
      ],
    },
    applications: [],
    tasks: [],
  }

  it('skips an already-added external id and answers only the appended rows', () => {
    const { catalog } = buildCatalog(seed, { delayMs: 0 })

    const added = catalog.add({ connection_id: CONNECTION_ID, external_ids: ['gh-1001', 'gh-1002'] })

    expect(added?.map((row) => row.external_id)).toEqual(['gh-1002'])
  })
})

describe('the preview catalog verifying a connection', () => {
  const seedWith = (accountLogin: string): CatalogSeed => ({
    connections: [{ id: 'connection-1', provider: RepoProvider.Github, account_login: accountLogin, status: ConnectionStatus.Error, repository_count: 0, created_at: '2026-07-20T09:00:00Z' }],
    repositories: [],
    catalogue: {},
    applications: [],
    tasks: [],
  })

  it('keeps a needs-reauth connection at error, mirroring the api', () => {
    const { catalog } = buildCatalog(seedWith('needs-reauth'), { delayMs: 0 })

    expect(catalog.verify('connection-1')?.status).toBe(ConnectionStatus.Error)
  })

  it('verifies every other connection', () => {
    const { catalog } = buildCatalog(seedWith('acme'), { delayMs: 0 })

    expect(catalog.verify('connection-1')?.status).toBe(ConnectionStatus.Verified)
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
