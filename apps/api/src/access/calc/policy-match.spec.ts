import { ApplicationRole, UserRole } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { APP, ORG, OTHER_APP, aBinding, aPolicy } from '../test-support/builders'
import { Action } from '../types'
import { defaultPolicies } from './default-policies'
import { isAllowed, patternMatches } from './policy-match'

const policies = defaultPolicies(ORG)
const applicationPath = (app: string) => `/organizations/${ORG}/applications/${app}`

describe('policy match', () => {
  it('denies a Viewer a write on an application it can read', () => {
    const viewer = [aBinding({ subject: ApplicationRole.Viewer, scope: APP })]

    const outcome = [Action.Read, Action.Write].map((action) =>
      isAllowed(viewer, policies, { orgId: ORG, resource: applicationPath(APP), action }),
    )

    expect(outcome).toEqual([true, false])
  })

  it('lets a Developer write on a task of the application it is bound to', () => {
    const developer = [aBinding({ subject: ApplicationRole.Developer, scope: APP })]

    expect(isAllowed(developer, policies, { orgId: ORG, resource: `${applicationPath(APP)}/tasks/T1`, action: Action.Write })).toBe(true)
  })

  it('denies a Developer a read on an application it is not bound to', () => {
    const developer = [aBinding({ subject: ApplicationRole.Developer, scope: APP })]

    expect(isAllowed(developer, policies, { orgId: ORG, resource: applicationPath(OTHER_APP), action: Action.Read })).toBe(false)
  })

  it('lets an OrgMember list the tasks of its organization', () => {
    const member = [aBinding({ subject: UserRole.OrgMember })]

    expect(isAllowed(member, policies, { orgId: ORG, resource: `/organizations/${ORG}/tasks`, action: Action.List })).toBe(true)
  })

  it('denies an OrgMember a write anywhere in its organization', () => {
    const member = [aBinding({ subject: UserRole.OrgMember })]

    expect(isAllowed(member, policies, { orgId: ORG, resource: `${applicationPath(APP)}/tasks/T1`, action: Action.Write })).toBe(false)
  })

  it('lets an OrgAdmin delete anything in its organization', () => {
    const admin = [aBinding({ subject: UserRole.OrgAdmin })]

    expect(isAllowed(admin, policies, { orgId: ORG, resource: applicationPath(APP), action: Action.Delete })).toBe(true)
  })

  it('denies a user whose binding no policy names', () => {
    const member = [aBinding({ subject: UserRole.OrgMember })]

    expect(isAllowed(member, [aPolicy({ subject: UserRole.OrgAdmin })], { orgId: ORG, resource: `/organizations/${ORG}/tasks`, action: Action.Read })).toBe(false)
  })

  it('matches a single star against exactly one path segment', () => {
    expect([patternMatches('/organizations/*/tasks', '/organizations/O1/tasks'), patternMatches('/organizations/*/tasks', '/organizations/O1/x/tasks')]).toEqual([true, false])
  })
})
