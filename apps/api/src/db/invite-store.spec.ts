import { InviteStatus, UserRole } from '@stackbox/contract'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import { AcceptOutcomeKind } from '../organizations/types'
import type { Database } from './client'
import { InviteStore } from './invite-store'
import { invite, roleBinding, userAccount } from './schema'
import { IDS, emptyTables, insertInvite, insertMember, insertOrganization } from './test-support/rows'

const NOW = new Date('2026-09-15T10:00:00Z')
const HOUR_AGO = new Date('2026-09-15T09:00:00Z')
const NEXT_WEEK = new Date('2026-09-22T10:00:00Z')

describe('InviteStore', () => {
  let db: Database
  let store: InviteStore

  beforeAll(async () => {
    db = await migratedTestDatabase()
    store = new InviteStore(db)
  })

  afterAll(async () => {
    await db.$client.end()
  })

  beforeEach(async () => {
    await emptyTables(db)
    await insertOrganization(db, IDS.org, 'acme')
    await insertOrganization(db, IDS.otherOrg, 'globex')
    await insertMember(db, { id: IDS.user, orgId: IDS.org, name: 'Ada Lovelace', email: 'ada@example.com', role: UserRole.OrgAdmin })
  })

  it('lists the invites of one organization newest first', async () => {
    await insertInvite(db, { id: IDS.invite, orgId: IDS.org, email: 'grace@example.com', tokenHash: 'hash-1', expiresAt: NEXT_WEEK, createdAt: HOUR_AGO })
    await insertInvite(db, { id: IDS.secondInvite, orgId: IDS.org, email: 'vik@example.com', tokenHash: 'hash-2', expiresAt: NEXT_WEEK, createdAt: NOW })
    await insertInvite(db, { orgId: IDS.otherOrg, email: 'someone@example.com', tokenHash: 'hash-3', expiresAt: NEXT_WEEK })

    expect((await store.list(IDS.org)).map((row) => row.id)).toEqual([IDS.secondInvite, IDS.invite])
  })

  it('inserts an invite pending with its creator and answers it without its hash', async () => {
    const stored = await store.insert({ orgId: IDS.org, email: 'grace@example.com', role: UserRole.OrgAdmin, tokenHash: 'hash-1', createdBy: IDS.user, expiresAt: NEXT_WEEK })

    expect({ ...stored, id: undefined, createdAt: undefined }).toEqual({
      id: undefined,
      orgId: IDS.org,
      email: 'grace@example.com',
      role: UserRole.OrgAdmin,
      status: InviteStatus.Pending,
      expiresAt: NEXT_WEEK,
      acceptedAt: null,
      createdAt: undefined,
    })
  })

  it('finds only the pending invites for an email in one organization', async () => {
    await insertInvite(db, { id: IDS.invite, orgId: IDS.org, email: 'grace@example.com', tokenHash: 'hash-1', expiresAt: NEXT_WEEK })
    await insertInvite(db, { orgId: IDS.org, email: 'grace@example.com', tokenHash: 'hash-2', expiresAt: NEXT_WEEK, status: InviteStatus.Revoked })
    await insertInvite(db, { orgId: IDS.otherOrg, email: 'grace@example.com', tokenHash: 'hash-3', expiresAt: NEXT_WEEK })

    expect((await store.pendingFor(IDS.org, 'grace@example.com')).map((row) => row.id)).toEqual([IDS.invite])
  })

  it('revokes a pending invite and leaves an accepted one alone', async () => {
    await insertInvite(db, { id: IDS.invite, orgId: IDS.org, email: 'grace@example.com', tokenHash: 'hash-1', expiresAt: NEXT_WEEK })
    await insertInvite(db, { id: IDS.secondInvite, orgId: IDS.org, email: 'vik@example.com', tokenHash: 'hash-2', expiresAt: NEXT_WEEK, status: InviteStatus.Accepted })

    await store.revoke(IDS.org, IDS.invite)
    await store.revoke(IDS.org, IDS.secondInvite)

    expect((await store.list(IDS.org)).map((row) => [row.id, row.status]).sort()).toEqual(
      [
        [IDS.invite, InviteStatus.Revoked],
        [IDS.secondInvite, InviteStatus.Accepted],
      ].sort(),
    )
  })

  it('finds an invite by its token hash with the name of its organization', async () => {
    await insertInvite(db, { id: IDS.invite, orgId: IDS.org, email: 'grace@example.com', tokenHash: 'hash-1', expiresAt: NEXT_WEEK })

    const found = await store.findByHash('hash-1')

    expect([found?.id, found?.organizationName, await store.findByHash('no-such-hash')]).toEqual([IDS.invite, 'acme', null])
  })

  it('accepts a pending invite into an account with the invite role, its binding and the invite marked accepted', async () => {
    await insertInvite(db, { id: IDS.invite, orgId: IDS.org, email: 'grace@example.com', role: UserRole.OrgAdmin, tokenHash: 'hash-1', expiresAt: NEXT_WEEK })

    const outcome = await store.accept({ tokenHash: 'hash-1', name: 'Grace Hopper', passwordHash: 'scrypt$c2FsdA==$a2V5', now: NOW })

    const account = outcome.kind === AcceptOutcomeKind.Accepted ? outcome.account : null
    const bindings = await db.select({ subject: roleBinding.subject }).from(roleBinding).where(eq(roleBinding.userId, account?.id ?? IDS.user))
    const [accepted] = await db.select({ status: invite.status, acceptedAt: invite.acceptedAt }).from(invite).where(eq(invite.id, IDS.invite))
    expect([account?.email, account?.orgRole, account?.organizationName, account?.passwordHash, bindings, accepted]).toEqual([
      'grace@example.com',
      UserRole.OrgAdmin,
      'acme',
      'scrypt$c2FsdA==$a2V5',
      [{ subject: UserRole.OrgAdmin }],
      { status: InviteStatus.Accepted, acceptedAt: NOW },
    ])
  })

  it('refuses an invite past its expiry, and an invite already accepted', async () => {
    await insertInvite(db, { orgId: IDS.org, email: 'grace@example.com', tokenHash: 'expired', expiresAt: HOUR_AGO })
    await insertInvite(db, { orgId: IDS.org, email: 'vik@example.com', tokenHash: 'accepted', expiresAt: NEXT_WEEK, status: InviteStatus.Accepted })

    expect([
      await store.accept({ tokenHash: 'expired', name: 'Grace Hopper', passwordHash: 'hash', now: NOW }),
      await store.accept({ tokenHash: 'accepted', name: 'Vik Rao', passwordHash: 'hash', now: NOW }),
    ]).toEqual([{ kind: AcceptOutcomeKind.NotPending }, { kind: AcceptOutcomeKind.NotPending }])
  })

  it('answers member exists when the email joined in the meantime, and leaves the invite pending', async () => {
    await insertInvite(db, { id: IDS.invite, orgId: IDS.org, email: 'ada@example.com', tokenHash: 'hash-1', expiresAt: NEXT_WEEK })

    const outcome = await store.accept({ tokenHash: 'hash-1', name: 'Ada again', passwordHash: 'hash', now: NOW })

    const accounts = await db.select({ id: userAccount.id }).from(userAccount).where(eq(userAccount.email, 'ada@example.com'))
    expect([outcome, accounts.length, (await store.findByHash('hash-1'))?.status]).toEqual([{ kind: AcceptOutcomeKind.MemberExists }, 1, InviteStatus.Pending])
  })

  it('answers unknown for a hash that matches no invite', async () => {
    expect(await store.accept({ tokenHash: 'no-such-hash', name: 'Grace Hopper', passwordHash: 'hash', now: NOW })).toEqual({ kind: AcceptOutcomeKind.Unknown })
  })
})
