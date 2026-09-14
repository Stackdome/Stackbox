import { ReleaseStatus } from '@stackbox/contract'

export const IN_FLIGHT: ReleaseStatus[] = [ReleaseStatus.Queued, ReleaseStatus.Building]

const RANK: Record<ReleaseStatus, number> = {
  [ReleaseStatus.Queued]: 0,
  [ReleaseStatus.Building]: 1,
  [ReleaseStatus.Live]: 2,
  [ReleaseStatus.Failed]: 2,
}

export function isInFlight(status: ReleaseStatus): boolean {
  return IN_FLIGHT.includes(status)
}

export function advancedStatus(current: ReleaseStatus, observed: ReleaseStatus): ReleaseStatus {
  if (!isInFlight(current)) return current
  return RANK[observed] > RANK[current] ? observed : current
}
