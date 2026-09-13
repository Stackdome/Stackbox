import { UserRole } from '@stackbox/contract'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import type { Database } from './client'
import { userAccount } from './schema'
import { IDS, emptyTables, insertOrganization } from './test-support/rows'
import { UserStore } from './user-store'

describe('UserStore', () => {
  let db: Database
  let store: UserStore

  beforeAll(async () => {
    db = await migratedTestDatabase()
    store = new UserStore(db)
  })

  afterAll(async () => {
    await db.$client.end()
  })

  beforeEach(async () => {
    await emptyTables(db)
    await insertOrganization(db, IDS.org, 'acme')
    await db.insert(userAccount).values({ id: IDS.user, orgId: IDS.org, email: 'ada@example.com', name: 'Ada', orgRole: UserRole.OrgAdmin })
  })

  it('finds a user by email together with the name of their organization', async () => {
    const found = await store.findByEmail('ada@example.com')

    expect({ id: found?.id, organizationName: found?.organizationName }).toEqual({ id: IDS.user, organizationName: 'acme' })
  })

  it('finds nobody for an email no user has', async () => {
    expect(await store.findByEmail('nobody@example.com')).toBeNull()
  })
})
