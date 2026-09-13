import { describe, expect, it } from 'vitest'
import { aTask } from '../../tasks/test-support/builders'
import { LEASE_TTL_MS, TICK_PERIOD_MS, isClaimable, leaseFor } from './lease'

const NOW = new Date('2026-09-13T10:00:00Z')

describe('the lease', () => {
  it('leases a task to its owner for thirty seconds', () => {
    expect(leaseFor('replica-a', NOW)).toEqual({ owner: 'replica-a', expiresAt: new Date('2026-09-13T10:00:30Z') })
  })

  it('treats a lease that expires exactly now as past', () => {
    expect(isClaimable(aTask({ leaseOwner: 'replica-a', leaseExpiresAt: NOW }), NOW)).toBe(true)
  })

  it('lets a lease outlive many ticks', () => {
    expect(LEASE_TTL_MS / TICK_PERIOD_MS).toBe(15)
  })
})
