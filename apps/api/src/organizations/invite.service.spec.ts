import { ConflictException, NotFoundException } from '@nestjs/common'
import { InviteStatus, UserRole } from '@stackbox/contract'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import type { AuthUser } from '../access/types'
import { passwordMetrics, verifyPassword } from '../auth/password'
import { hashSecret } from '../common/secret'
import type { Database } from '../db/client'
import { InviteStore } from '../db/invite-store'
import { invite } from '../db/schema'
import { IDS, emptyTables, insertInvite, insertMember, insertOrganization } from '../db/test-support/rows'
import { UserStore } from '../db/user-store'
import { InMemoryClock } from '../ports/fakes'
import { INVITE_NOT_PENDING, INVITE_PENDING, MEMBER_EXISTS, UNKNOWN_INVITE } from './errors'
import { InviteService } from './invite.service'

const NOW = new Date('2026-09-15T10:00:00Z')
const DAY_MS = 24 * 60 * 60 * 1000
const ADA: AuthUser = { id: IDS.user, orgId: IDS.org, email: 'ada@example.com', orgRole: UserRole.OrgAdmin }
const GRACE = { email: 'grace@example.com', role: UserRole.OrgMember }
const JOIN = { name: 'Grace Hopper', password: 'a long enough password' }

const tokenOf = (link: string) => link.slice(link.lastIndexOf('/') + 1)

describe('InviteService', () => {
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
    await insertMember(db, { id: IDS.user, orgId: IDS.org, name: 'Ada Lovelace', email: 'ada@example.com', role: UserRole.OrgAdmin })
  })

  function anInviteWorld() {
    const clock = new InMemoryClock(NOW)
    const users = new UserStore(db)
    return { clock, users, service: new InviteService(new InviteStore(db), users, clock) }
  }

  async function refusalOf(action: Promise<unknown>): Promise<unknown> {
    const error = await action.catch((thrown: unknown) => thrown)
    return (error instanceof ConflictException || error instanceof NotFoundException) && error.getResponse()
  }

  it('invites an email pending for seven days, with a link whose token is kept only as a hash', async () => {
    const { service } = anInviteWorld()

    const created = await service.create(IDS.org, ADA, GRACE)

    const [row] = await db.select().from(invite).where(eq(invite.id, created.id))
    expect([
      created.status,
      created.expires_at,
      created.link.startsWith('/invites/'),
      row.tokenHash === hashSecret(tokenOf(created.link)),
      JSON.stringify(row).includes(tokenOf(created.link)),
      row.createdBy,
    ]).toEqual([InviteStatus.Pending, '2026-09-22T10:00:00.000Z', true, true, false, IDS.user])
  })

  it('stores the email trimmed and lower-cased', async () => {
    const { service } = anInviteWorld()

    expect((await service.create(IDS.org, ADA, { ...GRACE, email: ' Grace@Example.com ' })).email).toBe('grace@example.com')
  })

  it('refuses an email that is already a member of the organization', async () => {
    const { service } = anInviteWorld()

    expect(await refusalOf(service.create(IDS.org, ADA, { email: 'ADA@example.com', role: UserRole.OrgMember }))).toEqual(MEMBER_EXISTS)
  })

  it('refuses an email with a pending invite, and invites it again once that invite has expired', async () => {
    const { clock, service } = anInviteWorld()
    await service.create(IDS.org, ADA, GRACE)

    const refused = await refusalOf(service.create(IDS.org, ADA, GRACE))
    clock.advance(7 * DAY_MS)
    const again = await service.create(IDS.org, ADA, GRACE)

    expect([refused, again.status]).toEqual([INVITE_PENDING, InviteStatus.Pending])
  })

  it('lists pending invites first, reading one past its expiry as expired', async () => {
    const { service } = anInviteWorld()
    await insertInvite(db, { id: IDS.invite, orgId: IDS.org, email: 'old@example.com', tokenHash: 'old', expiresAt: new Date(NOW.getTime() - DAY_MS), createdAt: new Date(NOW.getTime() - 8 * DAY_MS) })
    await insertInvite(db, { id: IDS.secondInvite, orgId: IDS.org, email: 'new@example.com', tokenHash: 'new', expiresAt: new Date(NOW.getTime() + DAY_MS), createdAt: new Date(NOW.getTime() - 6 * DAY_MS) })

    const listed = await service.list(IDS.org)

    expect(listed.items.map((item) => [item.email, item.status])).toEqual([
      ['new@example.com', InviteStatus.Pending],
      ['old@example.com', InviteStatus.Expired],
    ])
  })

  it('revokes a pending invite, and revoking it again or an id that is not a uuid changes nothing', async () => {
    const { service } = anInviteWorld()
    const created = await service.create(IDS.org, ADA, GRACE)

    await service.revoke(IDS.org, created.id)
    await service.revoke(IDS.org, created.id)
    await service.revoke(IDS.org, 'not-a-uuid')

    expect((await service.preview(tokenOf(created.link))).status).toBe(InviteStatus.Revoked)
  })

  it('previews an invite by its token with the organization name, and answers unknown for any other token', async () => {
    const { service } = anInviteWorld()
    const created = await service.create(IDS.org, ADA, GRACE)

    expect([await service.preview(tokenOf(created.link)), await refusalOf(service.preview('no-such-token'))]).toEqual([
      { organization_name: 'acme', email: 'grace@example.com', role: UserRole.OrgMember, status: InviteStatus.Pending },
      UNKNOWN_INVITE,
    ])
  })

  it('accepts an invite into an account with the invite role that signs in with the chosen password', async () => {
    const { service, users } = anInviteWorld()
    const created = await service.create(IDS.org, ADA, { ...GRACE, role: UserRole.OrgAdmin })

    const account = await service.accept(tokenOf(created.link), { name: ' Grace Hopper ', password: JOIN.password })

    const [stored] = await users.listByEmail(GRACE.email)
    expect([account.name, account.orgRole, account.organizationName, await verifyPassword(JOIN.password, stored.passwordHash ?? '')]).toEqual([
      'Grace Hopper',
      UserRole.OrgAdmin,
      'acme',
      true,
    ])
  })

  it('refuses to accept an invite twice, an expired invite, and a token that matches nothing', async () => {
    const { clock, service } = anInviteWorld()
    const accepted = await service.create(IDS.org, ADA, GRACE)
    const expiring = await service.create(IDS.org, ADA, { email: 'vik@example.com', role: UserRole.OrgMember })
    await service.accept(tokenOf(accepted.link), JOIN)
    clock.advance(7 * DAY_MS)

    expect([
      await refusalOf(service.accept(tokenOf(accepted.link), JOIN)),
      await refusalOf(service.accept(tokenOf(expiring.link), JOIN)),
      await refusalOf(service.accept('no-such-token', JOIN)),
    ]).toEqual([INVITE_NOT_PENDING, INVITE_NOT_PENDING, UNKNOWN_INVITE])
  })

  it('does not hash the password for a token that matches no invite', async () => {
    const { service } = anInviteWorld()
    const before = passwordMetrics.hashCalls

    await refusalOf(service.accept('no-such-token', JOIN))

    expect(passwordMetrics.hashCalls).toBe(before)
  })

  it('refuses to accept an invite for an email that joined in the meantime', async () => {
    const { service } = anInviteWorld()
    const created = await service.create(IDS.org, ADA, GRACE)
    await insertMember(db, { id: IDS.secondUser, orgId: IDS.org, name: 'Grace Hopper', email: GRACE.email })

    expect(await refusalOf(service.accept(tokenOf(created.link), JOIN))).toEqual(MEMBER_EXISTS)
  })
})
