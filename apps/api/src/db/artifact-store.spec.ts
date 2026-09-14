import { ArtifactKind } from '@stackbox/contract'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import { ArtifactStore } from './artifact-store'
import type { Database } from './client'
import { IDS, emptyTables, insertOrganization } from './test-support/rows'

const IMAGE = { kind: ArtifactKind.Screenshot, url: 'data:image/png;base64,iVBORw0KGgo=', meta: { name: 'cart.png' } }

describe('ArtifactStore', () => {
  let db: Database
  let store: ArtifactStore

  beforeAll(async () => {
    db = await migratedTestDatabase()
    store = new ArtifactStore(db)
  })

  afterAll(async () => {
    await db.$client.end()
  })

  beforeEach(async () => {
    await emptyTables(db)
    await insertOrganization(db, IDS.org)
    await insertOrganization(db, IDS.otherOrg, 'globex')
  })

  it('finds an uploaded image only inside the organization that uploaded it', async () => {
    const uploaded = await store.createUnattached(IDS.org, IMAGE)

    const found = [await store.findInOrg(IDS.org, uploaded.id), await store.findInOrg(IDS.otherOrg, uploaded.id)]

    expect(found.map((row) => row?.id ?? null)).toEqual([uploaded.id, null])
  })
})
