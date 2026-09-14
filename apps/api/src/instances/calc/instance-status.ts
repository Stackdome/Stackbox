import { InstanceStatus, ReleaseStatus } from '@stackbox/contract'

export type StatusFacts = {
  status: InstanceStatus
  expiresAt: Date | null
  latestRelease: { status: ReleaseStatus } | null
  now: Date
}

const SETTLED: InstanceStatus[] = [InstanceStatus.Expired, InstanceStatus.TornDown]

export function isRunning(status: InstanceStatus): boolean {
  return !SETTLED.includes(status)
}

export function nextStatus({ status, expiresAt, latestRelease, now }: StatusFacts): InstanceStatus {
  if (!isRunning(status)) return status
  if (expiresAt !== null && expiresAt.getTime() <= now.getTime()) return InstanceStatus.Expired
  if (latestRelease?.status === ReleaseStatus.Live) return InstanceStatus.Ready
  if (latestRelease?.status === ReleaseStatus.Failed) return InstanceStatus.Degraded
  return status
}
