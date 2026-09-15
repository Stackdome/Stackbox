import { ConflictException, NotFoundException } from '@nestjs/common'
import { UserRole } from '@stackbox/contract'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migratedTestDatabase } from '../../test/support/test-database'
import type { AuthUser } from '../access/types'
import type { Database } from '../db/client'
import { OrganizationStore } from '../db/organization-store'
import { IDS, emptyTables, insertMember, insertOrganization } from '../db/test-support/rows'
import { UserStore } from '../db/user-store'
import { LAST_ADMIN, MEMBER_NOT_FOUND, OWN_ACCOUNT } from './errors'
import { OrganizationService } from './organization.service'

const ADA: AuthUser = { id: IDS.user, orgId: IDS.org, email: 'ada@example.com', orgRole: UserRole.OrgAdmin }

describe('OrganizationService', () => {
  let db: Database
  let service: OrganizationService
  let users: UserStore

  beforeAll(async () => {
    db = await migratedTestDatabase()
    users = new UserStore(db)
    service = new OrganizationService(new OrganizationStore(db), users)
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
    await insertMember(db, { id: IDS.otherUser, orgId: IDS.otherOrg, name: 'Someone in globex' })
  })

  async function refusalOf(action: Promise<unknown>): Promise<unknown> {
    const error = await action.catch((thrown: unknown) => thrown)
    return (error instanceof ConflictException || error instanceof NotFoundException) && error.getResponse()
  }

  it('reads the organization with its budget', async () => {
    expect(await service.organization(IDS.org)).toMatchObject({ id: IDS.org, name: 'acme', budget_cents: 0 })
  })

  it('renames the organization, trimming the name, and changes its budget', async () => {
    const updated = await service.update(IDS.org, { name: '  acme labs ', budget_cents: 60_000 })

    expect([updated.name, updated.budget_cents]).toEqual(['acme labs', 60_000])
  })

  it('changes the monthly budget alone', async () => {
    expect(await service.update(IDS.org, { budget_cents: 1_000 })).toMatchObject({ name: 'acme', budget_cents: 1_000 })
  })

  it('lists the members of the organization by name', async () => {
    expect((await service.members(IDS.org)).items.map((member) => [member.name, member.role])).toEqual([
      ['Ada Lovelace', UserRole.OrgAdmin],
      ['Charles Babbage', UserRole.OrgMember],
    ])
  })

  it('makes a member an admin, and the member signs in again', async () => {
    const changed = await service.changeRole(IDS.org, ADA, IDS.secondUser, { role: UserRole.OrgAdmin })

    expect([changed.role, (await users.findById(IDS.secondUser))?.tokenVersion]).toEqual([UserRole.OrgAdmin, 1])
  })

  it('refuses to demote the last admin', async () => {
    expect(await refusalOf(service.changeRole(IDS.org, ADA, IDS.user, { role: UserRole.OrgMember }))).toEqual(LAST_ADMIN)
  })

  it('refuses a change to your own role while another admin exists', async () => {
    await service.changeRole(IDS.org, ADA, IDS.secondUser, { role: UserRole.OrgAdmin })

    expect(await refusalOf(service.changeRole(IDS.org, ADA, IDS.user, { role: UserRole.OrgMember }))).toEqual(OWN_ACCOUNT)
  })

  it('answers not found when changing the role of a member of another organization or of an id that is not a uuid', async () => {
    expect([
      await refusalOf(service.changeRole(IDS.org, ADA, IDS.otherUser, { role: UserRole.OrgAdmin })),
      await refusalOf(service.changeRole(IDS.org, ADA, 'not-a-uuid', { role: UserRole.OrgAdmin })),
    ]).toEqual([MEMBER_NOT_FOUND, MEMBER_NOT_FOUND])
  })

  it('removes a member, and removing them again answers the same', async () => {
    await service.remove(IDS.org, ADA, IDS.secondUser)
    await service.remove(IDS.org, ADA, IDS.secondUser)
    await service.remove(IDS.org, ADA, 'not-a-uuid')

    expect((await service.members(IDS.org)).items.map((member) => member.id)).toEqual([IDS.user])
  })

  it('refuses to remove the last admin', async () => {
    expect(await refusalOf(service.remove(IDS.org, ADA, IDS.user))).toEqual(LAST_ADMIN)
  })
})
