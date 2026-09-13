import { UserRole } from '@stackbox/contract'
import { Action, ORG_SCOPE, type Policy, type RoleBinding } from '../types'

export const ORG = 'O1'
export const APP = 'A1'
export const OTHER_APP = 'A2'

export function aPolicy(overrides: Partial<Policy> = {}): Policy {
  return { orgId: ORG, subject: UserRole.OrgMember, resource: `/organizations/${ORG}/**`, action: Action.Read, ...overrides }
}

export function aBinding(overrides: Partial<RoleBinding> = {}): RoleBinding {
  return { orgId: ORG, userId: 'U1', subject: UserRole.OrgMember, scope: ORG_SCOPE, ...overrides }
}
