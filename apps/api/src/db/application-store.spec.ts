import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import { ApplicationStore } from './application-store'
import type { Database } from './client'
import { IDS, emptyTables, insertApplication, insertOrganization } from './test-support/rows'

describe('ApplicationStore', () => {
  let db: Database
  let store: ApplicationStore

  beforeAll(async () => {
    db = await migratedTestDatabase()
    store = new ApplicationStore(db)
  })

  afterAll(async () => {
    await db.$client.end()
  })

  beforeEach(async () => {
    await emptyTables(db)
  })

  it('lists the applications of one organization by name', async () => {
    await insertOrganization(db, IDS.org)
    await insertOrganization(db, IDS.otherOrg, 'globex')
    await insertApplication(db, { orgId: IDS.org, repositoryId: IDS.repository, id: IDS.application, name: 'shop' })
    await insertApplication(db, { orgId: IDS.otherOrg, repositoryId: IDS.otherRepository, id: IDS.otherApplication, name: 'ledger' })

    expect(await store.listByOrg(IDS.org)).toEqual([{ id: IDS.application, name: 'shop' }])
  })
})
