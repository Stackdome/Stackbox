export const ROUTES = {
  tasks: '/tasks',
  newTask: '/tasks/new',
  task: '/tasks/:taskId',
  applications: '/applications',
  instances: '/instances',
  repositories: '/repositories',
  settings: '/settings',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]

export function taskPath(taskId: string): string {
  return ROUTES.task.replace(':taskId', taskId)
}
