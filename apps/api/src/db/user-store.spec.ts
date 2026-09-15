import { UserRole } from '@stackbox/contract'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import { MembershipRefusal } from '../organizations/calc/membership'
import { MemberOutcomeKind } from '../organizations/types'
import type { Database } from './client'
import { applicationInstance, roleBinding } from './schema'
import { IDS, emptyTables, insertApplication, insertInstance, insertMember, insertOrganization } from './test-support/rows'
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
    await insertOrganization(db, IDS.otherOrg, 'globex')
    await insertMember(db, { id: IDS.user, orgId: IDS.org, name: 'Ada Lovelace', email: 'ada@example.com', role: UserRole.OrgAdmin })
    await insertMember(db, { id: IDS.secondUser, orgId: IDS.org, name: 'Charles Babbage', email: 'charles@example.com' })
  })

  it('finds a user by email together with the name of their organization', async () => {
    const found = await store.findByEmail('ada@example.com')

    expect({ id: found?.id, organizationName: found?.organizationName, tokenVersion: found?.tokenVersion }).toEqual({
      id: IDS.user,
      organizationName: 'acme',
      tokenVersion: 0,
    })
  })

  it('finds nobody for an email no user has', async () => {
    expect(await store.findByEmail('nobody@example.com')).toBeNull()
  })

  it('lists every account an email has across organizations, by organization name, whatever the case of the email', async () => {
    await insertMember(db, { id: IDS.otherUser, orgId: IDS.otherOrg, name: 'Ada in globex', email: 'ada@example.com' })

    const accounts = await store.listByEmail('  ADA@Example.com ')

    expect(accounts.map((account) => account.organizationName)).toEqual(['acme', 'globex'])
  })

  it('lists the members of one organization by name', async () => {
    await insertMember(db, { id: IDS.otherUser, orgId: IDS.otherOrg, name: 'Someone in globex' })

    expect((await store.members(IDS.org)).map((member) => member.name)).toEqual(['Ada Lovelace', 'Charles Babbage'])
  })

  it('knows an email is already a member of an organization whatever its case, and of that organization only', async () => {
    expect([await store.isMember(IDS.org, 'ADA@example.com'), await store.isMember(IDS.otherOrg, 'ada@example.com')]).toEqual([true, false])
  })

  it('bumps the token version of one account', async () => {
    await store.bumpTokenVersion(IDS.user)

    expect([(await store.findById(IDS.user))?.tokenVersion, (await store.findById(IDS.secondUser))?.tokenVersion]).toEqual([1, 0])
  })

  it('makes a member an admin, rewrites the organization binding and bumps the version', async () => {
    const outcome = await store.changeRole({ orgId: IDS.org, callerId: IDS.user, userId: IDS.secondUser, role: UserRole.OrgAdmin })

    const bindings = await db.select({ subject: roleBinding.subject }).from(roleBinding).where(eq(roleBinding.userId, IDS.secondUser))
    expect([outcome.kind, outcome.kind === MemberOutcomeKind.Changed && outcome.member.orgRole, (await store.findById(IDS.secondUser))?.tokenVersion, bindings]).toEqual([
      MemberOutcomeKind.Changed,
      UserRole.OrgAdmin,
      1,
      [{ subject: UserRole.OrgAdmin }],
    ])
  })

  it('refuses to demote the last admin and leaves the role as it was', async () => {
    const outcome = await store.changeRole({ orgId: IDS.org, callerId: IDS.user, userId: IDS.user, role: UserRole.OrgMember })

    expect([outcome, (await store.findById(IDS.user))?.orgRole]).toEqual([
      { kind: MemberOutcomeKind.Refused, refusal: MembershipRefusal.LastAdmin },
      UserRole.OrgAdmin,
    ])
  })

  it('leaves the version alone when the role does not change', async () => {
    const outcome = await store.changeRole({ orgId: IDS.org, callerId: IDS.user, userId: IDS.secondUser, role: UserRole.OrgMember })

    expect([outcome.kind, outcome.kind === MemberOutcomeKind.Changed && outcome.member.orgRole, (await store.findById(IDS.secondUser))?.tokenVersion]).toEqual([
      MemberOutcomeKind.Changed,
      UserRole.OrgMember,
      0,
    ])
  })

  it('answers missing for an account of another organization', async () => {
    await insertMember(db, { id: IDS.otherUser, orgId: IDS.otherOrg, name: 'Someone in globex' })

    expect(await store.changeRole({ orgId: IDS.org, callerId: IDS.user, userId: IDS.otherUser, role: UserRole.OrgAdmin })).toEqual({ kind: MemberOutcomeKind.Missing })
  })

  it('removes a member with their bindings', async () => {
    const outcome = await store.remove({ orgId: IDS.org, callerId: IDS.user, userId: IDS.secondUser })

    const bindings = await db.select({ id: roleBinding.id }).from(roleBinding).where(eq(roleBinding.userId, IDS.secondUser))
    expect([outcome, (await store.members(IDS.org)).map((member) => member.id), bindings]).toEqual([{ kind: MemberOutcomeKind.Removed }, [IDS.user], []])
  })

  it('keeps the instance a removed member spun up, with no owner', async () => {
    await insertApplication(db, { orgId: IDS.org, repositoryId: IDS.repository, id: IDS.application, name: 'shop' })
    await insertInstance(db, { id: IDS.instance, applicationId: IDS.application, createdBy: IDS.secondUser })

    await store.remove({ orgId: IDS.org, callerId: IDS.user, userId: IDS.secondUser })

    const [instance] = await db.select({ createdBy: applicationInstance.createdBy }).from(applicationInstance).where(eq(applicationInstance.id, IDS.instance))
    expect(instance).toEqual({ createdBy: null })
  })

  it('refuses to remove your own account once another admin exists', async () => {
    await insertMember(db, { id: IDS.otherUser, orgId: IDS.org, name: 'Grace Hopper', role: UserRole.OrgAdmin })

    expect(await store.remove({ orgId: IDS.org, callerId: IDS.user, userId: IDS.user })).toEqual({ kind: MemberOutcomeKind.Refused, refusal: MembershipRefusal.OwnAccount })
  })

  it('answers missing when removing an account that is already gone', async () => {
    await store.remove({ orgId: IDS.org, callerId: IDS.user, userId: IDS.secondUser })

    expect(await store.remove({ orgId: IDS.org, callerId: IDS.user, userId: IDS.secondUser })).toEqual({ kind: MemberOutcomeKind.Missing })
  })
})
