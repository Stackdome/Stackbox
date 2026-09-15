import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import { ApiTokenStore } from './api-token-store'
import type { Database } from './client'
import { IDS, emptyTables, insertApiToken, insertMember, insertOrganization } from './test-support/rows'

const NOW = new Date('2026-09-15T10:00:00Z')
const HOUR_AGO = new Date('2026-09-15T09:00:00Z')

describe('ApiTokenStore', () => {
  let db: Database
  let store: ApiTokenStore

  beforeAll(async () => {
    db = await migratedTestDatabase()
    store = new ApiTokenStore(db)
  })

  afterAll(async () => {
    await db.$client.end()
  })

  beforeEach(async () => {
    await emptyTables(db)
    await insertOrganization(db, IDS.org, 'acme')
    await insertMember(db, { id: IDS.user, orgId: IDS.org, name: 'Ada Lovelace' })
    await insertMember(db, { id: IDS.secondUser, orgId: IDS.org, name: 'Charles Babbage' })
  })

  it('lists the tokens of one user newest first, leaving revoked ones out', async () => {
    await insertApiToken(db, { id: IDS.apiToken, userId: IDS.user, orgId: IDS.org, tokenHash: 'hash-1', createdAt: HOUR_AGO })
    await insertApiToken(db, { id: IDS.secondApiToken, userId: IDS.user, orgId: IDS.org, tokenHash: 'hash-2', createdAt: NOW })
    await insertApiToken(db, { userId: IDS.user, orgId: IDS.org, tokenHash: 'hash-3', revokedAt: NOW })
    await insertApiToken(db, { userId: IDS.secondUser, orgId: IDS.org, tokenHash: 'hash-4' })

    expect((await store.listFor(IDS.user)).map((token) => token.id)).toEqual([IDS.secondApiToken, IDS.apiToken])
  })

  it('inserts a token and finds it again by its hash, never answering the hash', async () => {
    const stored = await store.insert({ userId: IDS.user, orgId: IDS.org, name: 'ci', tokenHash: 'hash-1', prefix: 'sbx4Jq2p', expiresAt: null })

    const found = await store.findByHash('hash-1')
    expect([found?.id, found?.prefix, 'tokenHash' in (found ?? {}), await store.findByHash('no-such-hash')]).toEqual([stored.id, 'sbx4Jq2p', false, null])
  })

  it('revokes a token of the user, and answers true again on a second call without moving the revoked time', async () => {
    await insertApiToken(db, { id: IDS.apiToken, userId: IDS.user, orgId: IDS.org, tokenHash: 'hash-1' })

    const first = await store.revoke(IDS.user, IDS.apiToken, HOUR_AGO)
    const second = await store.revoke(IDS.user, IDS.apiToken, NOW)

    expect([first, second, (await store.findByHash('hash-1'))?.revokedAt]).toEqual([true, true, HOUR_AGO])
  })

  it('refuses to revoke a token of another user', async () => {
    await insertApiToken(db, { id: IDS.apiToken, userId: IDS.secondUser, orgId: IDS.org, tokenHash: 'hash-1' })

    expect([await store.revoke(IDS.user, IDS.apiToken, NOW), (await store.findByHash('hash-1'))?.revokedAt]).toEqual([false, null])
  })

  it('records when a token was last used', async () => {
    await insertApiToken(db, { id: IDS.apiToken, userId: IDS.user, orgId: IDS.org, tokenHash: 'hash-1' })

    await store.touch(IDS.apiToken, NOW)

    expect((await store.findByHash('hash-1'))?.lastUsedAt).toEqual(NOW)
  })
})
