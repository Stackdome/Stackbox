import { ConnectionStatus, RepoProvider } from '@stackbox/contract'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import type { Database } from './client'
import { GitConnectionStore } from './git-connection-store'
import { IDS, emptyTables, insertGitConnection, insertOrganization, insertRepository } from './test-support/rows'

describe('GitConnectionStore', () => {
  let db: Database
  let store: GitConnectionStore

  beforeAll(async () => {
    db = await migratedTestDatabase()
    store = new GitConnectionStore(db)
  })

  afterAll(async () => {
    await db.$client.end()
  })

  beforeEach(async () => {
    await emptyTables(db)
    await insertOrganization(db, IDS.org)
    await insertOrganization(db, IDS.otherOrg, 'globex')
  })

  it('lists the connections of one organization oldest first with their repository counts', async () => {
    await insertRepository(db, { orgId: IDS.org, id: IDS.repository, name: 'shop' })
    await insertRepository(db, { orgId: IDS.org, id: IDS.secondRepository, name: 'billing' })
    const gitlab = await store.create({ orgId: IDS.org, provider: RepoProvider.Gitlab, login: 'acme-platform' })
    await insertGitConnection(db, IDS.otherOrg)

    const listed = await store.listByOrg(IDS.org)

    expect(listed.map((row) => [row.id, row.repositoryCount])).toEqual([
      [IDS.connection, 2],
      [gitlab, 0],
    ])
  })

  it('knows a provider login the organization already connected, and only that one', async () => {
    await store.create({ orgId: IDS.org, provider: RepoProvider.Github, login: 'acme' })

    const answers = await Promise.all([
      store.exists(IDS.org, RepoProvider.Github, 'acme'),
      store.exists(IDS.org, RepoProvider.Gitlab, 'acme'),
      store.exists(IDS.otherOrg, RepoProvider.Github, 'acme'),
    ])

    expect(answers).toEqual([true, false, false])
  })

  it('records the verification status of a connection', async () => {
    const id = await store.create({ orgId: IDS.org, provider: RepoProvider.Github, login: 'acme' })

    await store.setStatus(id, ConnectionStatus.Error)

    expect((await store.findInOrg(IDS.org, id))?.status).toBe(ConnectionStatus.Error)
  })

  it('finds nothing for a connection of another organization', async () => {
    await insertGitConnection(db, IDS.otherOrg)

    expect(await store.findInOrg(IDS.org, IDS.otherConnection)).toBeNull()
  })
})
