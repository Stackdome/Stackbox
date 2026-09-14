import type { ApplicationRecord } from '../../applications/types'

export function hasServicesToRun(application: Pick<ApplicationRecord, 'syncedAtSha' | 'validationError'>): boolean {
  return application.validationError === null && application.syncedAtSha !== null
}
