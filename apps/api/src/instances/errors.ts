export { INSTANCE_NOT_FOUND, INSTANCE_NOT_RUNNING } from '../releases/errors'

export const PURPOSE_RESERVED = { code: 'purpose_reserved', message: 'Tasks create their own instances' } as const

export const UNKNOWN_APPLICATION = { code: 'unknown_application', message: 'application not found' } as const

export const APPLICATION_NOT_SYNCED = {
  code: 'application_not_synced',
  message: "Sync the application's Stackfile before spinning up an instance",
} as const

export const INSTANCE_HAS_NO_EXPIRY = { code: 'instance_has_no_expiry', message: 'A persistent instance never expires' } as const
