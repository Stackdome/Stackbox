import { UserRole } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { MembershipRefusal, removalRefusal, roleChangeRefusal } from './membership'

const ADA = { id: 'U1', orgRole: UserRole.OrgAdmin }
const GRACE = { id: 'U2', orgRole: UserRole.OrgAdmin }
const VIK = { id: 'U3', orgRole: UserRole.OrgMember }

describe('the membership refusals', () => {
  it('refuses to demote the last admin, even when the admin demotes themself', () => {
    expect(roleChangeRefusal({ callerId: ADA.id, target: ADA, role: UserRole.OrgMember, members: [ADA, VIK] })).toBe(MembershipRefusal.LastAdmin)
  })

  it('refuses a change to your own role once another admin exists', () => {
    expect(roleChangeRefusal({ callerId: ADA.id, target: ADA, role: UserRole.OrgMember, members: [ADA, GRACE, VIK] })).toBe(MembershipRefusal.OwnAccount)
  })

  it('lets an admin demote another admin while one admin remains, and promote a member', () => {
    expect([
      roleChangeRefusal({ callerId: ADA.id, target: GRACE, role: UserRole.OrgMember, members: [ADA, GRACE, VIK] }),
      roleChangeRefusal({ callerId: ADA.id, target: VIK, role: UserRole.OrgAdmin, members: [ADA, VIK] }),
    ]).toEqual([null, null])
  })

  it('refuses to remove the last admin, and your own account once another admin exists', () => {
    expect([
      removalRefusal({ callerId: ADA.id, target: ADA, members: [ADA, VIK] }),
      removalRefusal({ callerId: ADA.id, target: ADA, members: [ADA, GRACE] }),
    ]).toEqual([MembershipRefusal.LastAdmin, MembershipRefusal.OwnAccount])
  })

  it('lets an admin remove a member or another admin', () => {
    expect([
      removalRefusal({ callerId: ADA.id, target: VIK, members: [ADA, VIK] }),
      removalRefusal({ callerId: ADA.id, target: GRACE, members: [ADA, GRACE] }),
    ]).toEqual([null, null])
  })
})
