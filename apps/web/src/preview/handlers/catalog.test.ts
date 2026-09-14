// @vitest-environment jsdom
import { CoarseStatus, ConnectionStatus, InstanceExpiryHours, InstancePurpose, InstanceStatus, RepoProvider, ReleaseStatus, type components } from '@stackbox/contract'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { INSTANCE_IDS, ORG_ID, PREVIEW_CATALOG_SEED, TASK_SUMMARIES } from '../../../.storybook/fixtures'
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

describe('the preview catalog walking instances and releases', () => {
  const OWNER = { id: 'u1', name: 'Ada Lovelace' }

  function detailOf(result: object | null): components['schemas']['InstanceDetail'] {
    if (result === null || 'body' in result) throw new Error(`expected an instance, got ${JSON.stringify(result)}`)
    return result as components['schemas']['InstanceDetail']
  }

  afterEach(() => {
    vi.useRealTimers()
  })

  it('walks a spun up instance to ready once its first release goes live', () => {
    vi.useFakeTimers()
    const { catalog } = buildCatalog(PREVIEW_CATALOG_SEED, { delayMs: 0 })
    const created = detailOf(catalog.spinUp({ application_id: 'app-shop', purpose: InstancePurpose.Scratch, expires_in_hours: InstanceExpiryHours.Day }, OWNER))

    vi.advanceTimersByTime(1_000)
    const building = catalog.instance(created.id)?.releases[0].status
    vi.advanceTimersByTime(2_000)
    const walked = catalog.instance(created.id)

    expect([created.status, building, walked?.releases[0].status, walked?.status]).toEqual([
      InstanceStatus.Provisioning,
      ReleaseStatus.Building,
      ReleaseStatus.Live,
      InstanceStatus.Ready,
    ])
  })

  it('prepends a queued release on Deploy and refuses a second while it is in flight', () => {
    vi.useFakeTimers()
    const { catalog } = buildCatalog(PREVIEW_CATALOG_SEED, { delayMs: 0 })

    const first = catalog.deploy(INSTANCE_IDS.persistent, {})
    const second = catalog.deploy(INSTANCE_IDS.persistent, {})

    expect([catalog.instance(INSTANCE_IDS.persistent)?.releases.map((release) => release.status), second]).toEqual([
      [ReleaseStatus.Queued, ReleaseStatus.Live, ReleaseStatus.Live],
      { status: 409, body: { code: 'release_in_flight', message: 'Wait for the release in flight to finish first' } },
    ])
    expect(first).not.toBeNull()
    catalog.dispose()
  })

  it('refuses spinning up an application whose Stackfile failed validation', () => {
    const { catalog } = buildCatalog(PREVIEW_CATALOG_SEED, { delayMs: 0 })

    expect(catalog.spinUp({ application_id: 'app-ledger', purpose: InstancePurpose.Scratch }, OWNER)).toEqual({
      status: 409,
      body: { code: 'application_not_synced', message: "Sync the application's Stackfile before spinning up an instance" },
    })
  })

  it('tears an instance down, refuses to extend it afterwards and never extends a persistent one', () => {
    const { catalog } = buildCatalog(PREVIEW_CATALOG_SEED, { delayMs: 0 })

    const tornDown = detailOf(catalog.teardown(INSTANCE_IDS.scratch))

    expect([tornDown.status, catalog.extendExpiry(INSTANCE_IDS.scratch, InstanceExpiryHours.Day), catalog.extendExpiry(INSTANCE_IDS.persistent, InstanceExpiryHours.Day)]).toEqual([
      InstanceStatus.TornDown,
      { status: 409, body: { code: 'instance_not_running', message: 'This instance has expired or been torn down' } },
      { status: 409, body: { code: 'instance_has_no_expiry', message: 'A persistent instance never expires' } },
    ])
  })

  it('leaves torn down instances out of the list unless asked, newest first', () => {
    const { catalog } = buildCatalog(PREVIEW_CATALOG_SEED, { delayMs: 0 })

    const hidden = catalog.instances({ applicationId: null, includeTornDown: false })
    const shown = catalog.instances({ applicationId: null, includeTornDown: true })

    expect([hidden.length, shown.length, hidden[0].id]).toEqual([7, 8, INSTANCE_IDS.taskProvisioning])
  })

  it('stops every pending walk once disposed', () => {
    vi.useFakeTimers()
    const { catalog } = buildCatalog(PREVIEW_CATALOG_SEED, { delayMs: 0 })
    catalog.deploy(INSTANCE_IDS.persistent, {})

    catalog.dispose()
    vi.advanceTimersByTime(3_000)

    expect(catalog.instance(INSTANCE_IDS.persistent)?.releases[0].status).toBe(ReleaseStatus.Queued)
  })

  it("reads an instance's task live from the task book, not the seeded snapshot", () => {
    const taskBook = new PreviewTaskBook(TASK_SUMMARIES, [])
    const { catalog } = buildCatalog(PREVIEW_CATALOG_SEED, { delayMs: 0, taskBook })
    const fixture = taskBook.find('task-4')
    if (!fixture) throw new Error('expected task-4 to be seeded')
    taskBook.replace({ ...fixture, detail: { ...fixture.detail, coarse_status: CoarseStatus.ReadyForReview } })

    expect(catalog.instance(INSTANCE_IDS.taskProvisioning)?.task).toEqual({
      id: 'task-4',
      description: 'Discount code is ignored in the cart total',
      coarse_status: CoarseStatus.ReadyForReview,
    })
  })

  it('refuses spinning up an instance on a ref the repository does not have', () => {
    const { catalog } = buildCatalog(PREVIEW_CATALOG_SEED, { delayMs: 0 })

    expect(catalog.spinUp({ application_id: 'app-shop', purpose: InstancePurpose.Scratch, ref: 'feature/unknown' }, OWNER)).toEqual({
      status: 404,
      body: { code: 'unknown_ref', message: 'The repository has no branch or tag with this name' },
    })
  })

  it('refuses deploying a release on a ref the repository does not have', () => {
    const { catalog } = buildCatalog(PREVIEW_CATALOG_SEED, { delayMs: 0 })

    expect(catalog.deploy(INSTANCE_IDS.persistent, { ref: 'feature/unknown' })).toEqual({
      status: 404,
      body: { code: 'unknown_ref', message: 'The repository has no branch or tag with this name' },
    })
  })
})
