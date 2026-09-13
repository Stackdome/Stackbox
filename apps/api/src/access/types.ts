import type { ApplicationRole, UserRole } from '@stackbox/contract'

export const Action = {
  Read: 'read',
  Write: 'write',
  Create: 'create',
  Delete: 'delete',
  List: 'list',
  Logs: 'logs',
  Exec: 'exec',
} as const
export type Action = (typeof Action)[keyof typeof Action]

export type Subject = UserRole | ApplicationRole

// A binding's scope is either the whole organization or one application id.
export const ORG_SCOPE = 'org'

export type Policy = { orgId: string; subject: Subject; resource: string; action: Action }

export type RoleBinding = { orgId: string; userId: string; subject: Subject; scope: string }

export type AuthUser = { id: string; orgId: string; email: string; orgRole: UserRole }

export type AccessRequest = { orgId: string; resource: string; action: Action }
