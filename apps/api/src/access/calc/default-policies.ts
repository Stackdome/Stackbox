import { ApplicationRole, UserRole } from '@stackbox/contract'
import { Action, type Policy, type Subject } from '../types'
import { SCOPE_TOKEN } from './policy-match'

export function defaultPolicies(orgId: string): Policy[] {
  const everything = `/organizations/${orgId}/**`
  const boundApplication = `/organizations/${orgId}/applications/${SCOPE_TOKEN}/**`
  const grant = (subject: Subject, resource: string, actions: Action[]): Policy[] =>
    actions.map((action) => ({ orgId, subject, resource, action }))

  return [
    ...grant(UserRole.OrgAdmin, everything, Object.values(Action)),
    ...grant(UserRole.OrgMember, everything, [Action.Read, Action.List]),
    ...grant(ApplicationRole.Developer, boundApplication, [Action.Read, Action.List, Action.Write, Action.Create, Action.Logs, Action.Exec]),
    ...grant(ApplicationRole.Viewer, boundApplication, [Action.Read, Action.List]),
  ]
}
