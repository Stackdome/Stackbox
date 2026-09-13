import { ApplicationRole, UserRole } from '@stackbox/contract'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import { Action, ORG_SCOPE } from '../access/types'
import type { Database } from './client'
import { PolicyStore } from './policy-store'
import { policy, roleBinding, userAccount } from './schema'
import { IDS, emptyTables, insertOrganization } from './test-support/rows'

describe('PolicyStore', () => {
  let db: Database
  let store: PolicyStore

  beforeAll(async () => {
    db = await migratedTestDatabase()
    store = new PolicyStore(db)
  })

  afterAll(async () => {
    await db.$client.end()
  })

  beforeEach(async () => {
    await emptyTables(db)
    await insertOrganization(db, IDS.org)
    await db.insert(userAccount).values([
      { id: IDS.user, orgId: IDS.org, email: 'ada@example.com', orgRole: UserRole.OrgAdmin },
      { id: IDS.otherUser, orgId: IDS.org, email: 'vik@example.com', orgRole: UserRole.OrgMember },
    ])
  })

  it('loads only the bindings of the user asked about', async () => {
    await db.insert(roleBinding).values([
      { orgId: IDS.org, userId: IDS.user, subject: UserRole.OrgAdmin, scope: ORG_SCOPE },
      { orgId: IDS.org, userId: IDS.otherUser, subject: ApplicationRole.Viewer, scope: IDS.application },
    ])

    expect(await store.bindingsFor(IDS.org, IDS.otherUser)).toEqual([
      { orgId: IDS.org, userId: IDS.otherUser, subject: ApplicationRole.Viewer, scope: IDS.application },
    ])
  })

  it('loads the policies of the organization', async () => {
    await db.insert(policy).values({ orgId: IDS.org, subject: UserRole.OrgMember, resource: `/organizations/${IDS.org}/**`, action: Action.Read })

    expect(await store.policiesFor(IDS.org)).toEqual([
      { orgId: IDS.org, subject: UserRole.OrgMember, resource: `/organizations/${IDS.org}/**`, action: Action.Read },
    ])
  })
})
