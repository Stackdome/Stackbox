import { NotFoundException } from '@nestjs/common'
import { ApiTokenExpiryDays, UserRole } from '@stackbox/contract'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import type { AuthUser } from '../access/types'
import { hashSecret } from '../common/secret'
import { ApiTokenStore } from '../db/api-token-store'
import type { Database } from '../db/client'
import { apiToken } from '../db/schema'
import { IDS, emptyTables, insertApiToken, insertMember, insertOrganization } from '../db/test-support/rows'
import { InMemoryClock } from '../ports/fakes'
import { ApiTokenService } from './api-token.service'
import { API_TOKEN_NOT_FOUND } from './errors'

const NOW = new Date('2026-09-15T10:00:00Z')
const AFTER_ANY_DATABASE_NOW = new Date('2100-01-01T00:00:00Z')
const ADA: AuthUser = { id: IDS.user, orgId: IDS.org, email: 'ada@example.com', orgRole: UserRole.OrgAdmin }
const CHARLES: AuthUser = { id: IDS.secondUser, orgId: IDS.org, email: 'charles@example.com', orgRole: UserRole.OrgMember }

describe('ApiTokenService', () => {
  let db: Database

  beforeAll(async () => {
    db = await migratedTestDatabase()
  })

  afterAll(async () => {
    await db.$client.end()
  })

  beforeEach(async () => {
    await emptyTables(db)
    await insertOrganization(db, IDS.org, 'acme')
    await insertMember(db, { id: IDS.user, orgId: IDS.org, name: 'Ada Lovelace', role: UserRole.OrgAdmin })
    await insertMember(db, { id: IDS.secondUser, orgId: IDS.org, name: 'Charles Babbage' })
  })

  function aService() {
    const clock = new InMemoryClock(NOW)
    return new ApiTokenService(new ApiTokenStore(db), clock)
  }

  it('creates a token whose secret starts with its prefix and never expires when no expiry is asked', async () => {
    const created = await aService().create(ADA, { name: ' ci deploys ' })

    expect([created.name, created.secret.startsWith(created.prefix), created.prefix.length, created.expires_at, created.last_used_at]).toEqual([
      'ci deploys',
      true,
      8,
      null,
      null,
    ])
  })

  it('expires a token 90 days out when asked', async () => {
    const created = await aService().create(ADA, { name: 'ci', expires_in_days: ApiTokenExpiryDays.Quarter })

    expect(created.expires_at).toBe('2026-12-14T10:00:00.000Z')
  })

  it('stores only the hash of the secret', async () => {
    const created = await aService().create(ADA, { name: 'ci' })

    const [row] = await db.select().from(apiToken).where(eq(apiToken.id, created.id))
    expect([row.tokenHash === hashSecret(created.secret), JSON.stringify(row).includes(created.secret)]).toEqual([true, false])
  })

  it('lists the tokens of the user newest first, without their secrets and without revoked ones', async () => {
    const service = aService()
    await service.create(CHARLES, { name: 'charles token' })
    const first = await service.create(ADA, { name: 'first' })
    await insertApiToken(db, { userId: IDS.user, orgId: IDS.org, tokenHash: 'revoked', revokedAt: NOW })
    await insertApiToken(db, { userId: IDS.user, orgId: IDS.org, tokenHash: 'newer', name: 'second', createdAt: AFTER_ANY_DATABASE_NOW })

    const listed = await service.list(ADA)

    expect([listed.items.map((token) => token.name), JSON.stringify(listed).includes(first.secret)]).toEqual([['second', 'first'], false])
  })

  it('revokes a token of the user, and answers the same on a second revoke', async () => {
    const service = aService()
    const created = await service.create(ADA, { name: 'ci' })

    await service.revoke(ADA, created.id)
    await service.revoke(ADA, created.id)

    expect((await service.list(ADA)).items).toEqual([])
  })

  it('answers not found for a token of another user and for an id that is not a uuid', async () => {
    const service = aService()
    const charles = await service.create(CHARLES, { name: 'charles token' })

    const outcomes = await Promise.allSettled([service.revoke(ADA, charles.id), service.revoke(ADA, 'not-a-uuid')])

    expect(outcomes.map((outcome) => outcome.status === 'rejected' && outcome.reason instanceof NotFoundException && outcome.reason.getResponse())).toEqual([
      API_TOKEN_NOT_FOUND,
      API_TOKEN_NOT_FOUND,
    ])
  })
})
