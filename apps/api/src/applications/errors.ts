export const SLUG_TAKEN = { code: 'slug_taken', message: 'Another application already uses this slug' } as const

export const APPLICATION_HAS_ACTIVE_TASKS = {
  code: 'application_has_active_tasks',
  message: "Cancel or finish the application's running tasks first",
} as const

export const APPLICATION_NOT_FOUND = { message: 'application not found' } as const
