import { InstanceExpiryHours, InstancePurpose } from '@stackbox/contract'

const HOUR_MS = 3_600_000

export const DEFAULT_EXPIRY_HOURS = InstanceExpiryHours.ThreeDays

export function hoursAfter(now: Date, hours: number): Date {
  return new Date(now.getTime() + hours * HOUR_MS)
}

export function expiresAtFor(purpose: InstancePurpose, hours: InstanceExpiryHours | null | undefined, now: Date): Date | null {
  if (purpose === InstancePurpose.Persistent) return null
  return hoursAfter(now, hours ?? DEFAULT_EXPIRY_HOURS)
}
