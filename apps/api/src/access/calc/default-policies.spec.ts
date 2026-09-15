import { ApplicationRole, UserRole } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { APP, ORG, aBinding } from '../test-support/builders'
import { Action, type RoleBinding } from '../types'
import { defaultPolicies } from './default-policies'
import { isAllowed } from './policy-match'

const policies = defaultPolicies(ORG)
const admin = [aBinding({ subject: UserRole.OrgAdmin })]
const member = [aBinding({ subject: UserRole.OrgMember })]
const viewer = [...member, aBinding({ subject: ApplicationRole.Viewer, scope: APP })]
const developer = [...member, aBinding({ subject: ApplicationRole.Developer, scope: APP })]

function can(bindings: RoleBinding[], path: string, action: Action): boolean {
  return isAllowed(bindings, policies, { orgId: ORG, resource: `/organizations/${ORG}${path}`, action })
}

describe('the default policies', () => {
  it('let an OrgMember list and read git connections and repositories but change neither', () => {
    expect([
      can(member, '/git-connections', Action.List),
      can(member, '/git-connections/C1', Action.Read),
      can(member, '/repositories', Action.List),
      can(member, '/git-connections', Action.Create),
      can(member, '/git-connections/C1', Action.Write),
      can(member, '/repositories', Action.Create),
      can(member, '/repositories/R1', Action.Delete),
    ]).toEqual([true, true, true, false, false, false, false])
  })

  it('let an OrgAdmin create, write and delete git connections, repositories and applications', () => {
    expect([
      can(admin, '/git-connections', Action.Create),
      can(admin, '/git-connections/C1', Action.Write),
      can(admin, '/repositories', Action.Create),
      can(admin, '/repositories/R1', Action.Delete),
      can(admin, '/applications', Action.Create),
      can(admin, `/applications/${APP}`, Action.Write),
      can(admin, `/applications/${APP}`, Action.Delete),
    ]).toEqual([true, true, true, true, true, true, true])
  })

  it('deny a Viewer the creation of an application and any change to repositories', () => {
    expect([can(viewer, '/applications', Action.Create), can(viewer, '/repositories', Action.Create), can(viewer, `/applications/${APP}`, Action.Read)]).toEqual([
      false,
      false,
      true,
    ])
  })

  it('let a Developer re-sync the application it is bound to but not delete it', () => {
    expect([can(developer, `/applications/${APP}`, Action.Write), can(developer, `/applications/${APP}`, Action.Delete)]).toEqual([true, false])
  })

  it('let an OrgMember list and read instances and their releases but never spin up, tear down or deploy', () => {
    expect([
      can(member, '/instances', Action.List),
      can(member, '/instances/I1', Action.Read),
      can(member, '/instances/I1/releases', Action.Read),
      can(member, `/applications/${APP}/instances`, Action.Create),
      can(member, '/instances/I1', Action.Write),
      can(member, '/instances/I1/releases', Action.Create),
    ]).toEqual([true, true, true, false, false, false])
  })

  it('let an OrgAdmin spin up, tear down, extend and deploy', () => {
    expect([
      can(admin, `/applications/${APP}/instances`, Action.Create),
      can(admin, '/instances/I1', Action.Write),
      can(admin, '/instances/I1/releases', Action.Create),
    ]).toEqual([true, true, true])
  })

  it('let a Developer spin up an instance of the application it is bound to but not tear one down', () => {
    expect([can(developer, `/applications/${APP}/instances`, Action.Create), can(developer, '/instances/I1', Action.Write)]).toEqual([true, false])
  })

  it('deny a Viewer spinning up an instance even of the application it is bound to', () => {
    expect(can(viewer, `/applications/${APP}/instances`, Action.Create)).toBe(false)
  })

  it('let an OrgMember read the organization and list its members, but change neither and invite no one', () => {
    expect([
      can(member, '', Action.Read),
      can(member, '/users', Action.List),
      can(member, '/invites', Action.List),
      can(member, '', Action.Write),
      can(member, '/users/U2', Action.Write),
      can(member, '/users/U2', Action.Delete),
      can(member, '/invites', Action.Create),
      can(member, '/invites/I1', Action.Delete),
    ]).toEqual([true, true, true, false, false, false, false, false])
  })

  it('let an OrgAdmin rename the organization, change and remove members, and send and revoke invites', () => {
    expect([
      can(admin, '', Action.Write),
      can(admin, '/users/U2', Action.Write),
      can(admin, '/users/U2', Action.Delete),
      can(admin, '/invites', Action.Create),
      can(admin, '/invites/I1', Action.Delete),
    ]).toEqual([true, true, true, true, true])
  })
})
