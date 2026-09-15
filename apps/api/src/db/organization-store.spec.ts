import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import type { Database } from './client'
import { OrganizationStore } from './organization-store'
import { IDS, emptyTables, insertOrganization } from './test-support/rows'

describe('OrganizationStore', () => {
  let db: Database
  let store: OrganizationStore

  beforeAll(async () => {
    db = await migratedTestDatabase()
    store = new OrganizationStore(db)
  })

  afterAll(async () => {
    await db.$client.end()
  })

  beforeEach(async () => {
    await emptyTables(db)
    await insertOrganization(db, IDS.org, 'acme')
  })

  it('reads an organization with a budget of 0 until one is set', async () => {
    const found = await store.find(IDS.org)

    expect([found?.name, found?.budgetCents]).toEqual(['acme', 0])
  })

  it('renames an organization and changes its budget in one update', async () => {
    const updated = await store.update(IDS.org, { name: 'acme labs', budgetCents: 60_000 })

    expect([updated?.name, updated?.budgetCents, (await store.find(IDS.org))?.name]).toEqual(['acme labs', 60_000, 'acme labs'])
  })

  it('changes the budget alone and keeps the name', async () => {
    const updated = await store.update(IDS.org, { budgetCents: 1_000 })

    expect([updated?.name, updated?.budgetCents]).toEqual(['acme', 1_000])
  })

  it('answers the organization unchanged for an update with nothing to change', async () => {
    expect((await store.update(IDS.org, {}))?.name).toBe('acme')
  })

  it('finds nothing for an organization that does not exist', async () => {
    expect([await store.find(IDS.otherOrg), await store.update(IDS.otherOrg, { name: 'globex' })]).toEqual([null, null])
  })
})
