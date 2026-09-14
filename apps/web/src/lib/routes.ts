export const ROUTES = {
  tasks: '/tasks',
  newTask: '/tasks/new',
  task: '/tasks/:taskId',
  applications: '/applications',
  newApplication: '/applications/new',
  application: '/applications/:applicationId',
  instances: '/instances',
  repositories: '/repositories',
  settings: '/settings',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]

export function taskPath(taskId: string): string {
  return ROUTES.task.replace(':taskId', taskId)
}

export function applicationPath(applicationId: string): string {
  return ROUTES.application.replace(':applicationId', applicationId)
}
