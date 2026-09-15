export const ROUTES = {
  tasks: '/tasks',
  newTask: '/tasks/new',
  task: '/tasks/:taskId',
  applications: '/applications',
  newApplication: '/applications/new',
  application: '/applications/:applicationId',
  instances: '/instances',
  instance: '/instances/:instanceId',
  repositories: '/repositories',
  settings: '/settings',
  settingsMembers: '/settings/members',
  settingsTokens: '/settings/tokens',
  login: '/login',
  invite: '/invites/:token',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]

export function taskPath(taskId: string): string {
  return ROUTES.task.replace(':taskId', taskId)
}

export function applicationPath(applicationId: string): string {
  return ROUTES.application.replace(':applicationId', applicationId)
}

export function instancePath(instanceId: string): string {
  return ROUTES.instance.replace(':instanceId', instanceId)
}

export function invitePath(token: string): string {
  return ROUTES.invite.replace(':token', token)
}
