import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import { aProviderRepository } from '../repositories/test-support/builders'
import { aGitConnection } from '../tasks/test-support/builders'
import type { Database } from './client'
import { RepositoryStore } from './repository-store'
import {
  IDS,
  TEST_INSTALLATION_REF,
  emptyTables,
  insertApplicationOn,
  insertGitConnection,
  insertOrganization,
  insertRepository,
} from './test-support/rows'

describe('RepositoryStore', () => {
  let db: Database
  let store: RepositoryStore

  beforeAll(async () => {
    db = await migratedTestDatabase()
    store = new RepositoryStore(db)
  })

  afterAll(async () => {
    await db.$client.end()
  })

  beforeEach(async () => {
    await emptyTables(db)
    await insertOrganization(db, IDS.org)
    await insertOrganization(db, IDS.otherOrg, 'globex')
  })

  it('lists repositories by full name with the applications each backs, by name', async () => {
    await insertRepository(db, { orgId: IDS.org, id: IDS.repository, name: 'shop' })
    await insertRepository(db, { orgId: IDS.org, id: IDS.secondRepository, name: 'billing' })
    await insertApplicationOn(db, { orgId: IDS.org, repositoryId: IDS.repository, id: IDS.secondApplication, name: 'shop-admin' })
    await insertApplicationOn(db, { orgId: IDS.org, repositoryId: IDS.repository, id: IDS.application, name: 'shop' })

    const listed = await store.listByOrg(IDS.org)

    expect(listed.map((row) => [row.fullName, row.usedBy.map((use) => use.name)])).toEqual([
      ['acme/billing', []],
      ['acme/shop', ['shop', 'shop-admin']],
    ])
  })

  it('adds listed repositories through a connection and skips one the organization already added', async () => {
    await insertGitConnection(db, IDS.org)
    const connection = aGitConnection({ id: IDS.connection, orgId: IDS.org })
    const shop = aProviderRepository('gh-1001', 'acme/shop')
    await store.addMany(IDS.org, connection, [shop])

    const added = await store.addMany(IDS.org, connection, [shop, aProviderRepository('gh-1004', 'acme/acme-api')])

    expect(added.map((row) => [row.fullName, row.connectionId])).toEqual([['acme/acme-api', IDS.connection]])
  })

  it('locates a repository with the installation the provider reaches it through', async () => {
    await insertRepository(db, { orgId: IDS.org, id: IDS.repository, name: 'shop', externalId: 'gh-1001' })

    expect(await store.locate(IDS.org, IDS.repository)).toEqual({
      id: IDS.repository,
      fullName: 'acme/shop',
      defaultBranch: 'main',
      externalId: 'gh-1001',
      installationRef: TEST_INSTALLATION_REF,
    })
  })

  it('finds nothing for a repository of another organization', async () => {
    await insertRepository(db, { orgId: IDS.otherOrg, id: IDS.otherRepository, name: 'ledger' })

    expect([await store.findInOrg(IDS.org, IDS.otherRepository), await store.locate(IDS.org, IDS.otherRepository)]).toEqual([null, null])
  })

  it('removes a repository', async () => {
    await insertRepository(db, { orgId: IDS.org, id: IDS.repository, name: 'shop' })

    await store.remove(IDS.repository)

    expect(await store.listByOrg(IDS.org)).toEqual([])
  })
})
