export const ROUTES = {
  tasks: '/tasks',
  applications: '/applications',
  instances: '/instances',
  repositories: '/repositories',
  settings: '/settings',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]
