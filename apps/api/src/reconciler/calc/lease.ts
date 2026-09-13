import type { Task } from '../../tasks/types'

export const LEASE_TTL_MS = 30_000
export const TICK_PERIOD_MS = 2_000

export type Lease = { owner: string; expiresAt: Date }

// completedAt, not the phase, marks a task with nothing left to do: a cancelled task still needs its cleanup tick.
export function isClaimable(task: Pick<Task, 'completedAt' | 'leaseExpiresAt'>, now: Date): boolean {
  const leaseFree = task.leaseExpiresAt === null || task.leaseExpiresAt.getTime() <= now.getTime()
  return task.completedAt === null && leaseFree
}

export function leaseFor(owner: string, now: Date, ttlMs: number = LEASE_TTL_MS): Lease {
  return { owner, expiresAt: new Date(now.getTime() + ttlMs) }
}
