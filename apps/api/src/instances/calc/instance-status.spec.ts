import { InstanceStatus, ReleaseStatus } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { aReleaseRecord, anInstance } from '../test-support/builders'
import type { InstanceRecord } from '../types'
import { isRunning, nextStatus } from './instance-status'

const NOW = new Date('2026-09-14T10:00:00Z')
const HOUR_AGO = new Date('2026-09-14T09:00:00Z')
const IN_AN_HOUR = new Date('2026-09-14T11:00:00Z')

function statusAfterSweep(instance: InstanceRecord): InstanceStatus {
  return nextStatus({ status: instance.status, expiresAt: instance.expiresAt, latestRelease: instance.releases[0] ?? null, now: NOW })
}

describe('nextStatus', () => {
  it('keeps a torn down instance torn down whatever its releases and expiry say', () => {
    const tornDown = anInstance().withStatus(InstanceStatus.TornDown).withExpiry(HOUR_AGO).withReleases(aReleaseRecord()).build()

    expect(statusAfterSweep(tornDown)).toBe(InstanceStatus.TornDown)
  })

  it('expires a provisioning, ready or degraded instance once its expiry has passed', () => {
    const statuses = [InstanceStatus.Provisioning, InstanceStatus.Ready, InstanceStatus.Degraded].map((status) =>
      statusAfterSweep(anInstance().withStatus(status).withExpiry(HOUR_AGO).withReleases(aReleaseRecord()).build()),
    )

    expect(statuses).toEqual([InstanceStatus.Expired, InstanceStatus.Expired, InstanceStatus.Expired])
  })

  it('keeps an expired instance expired when a later release goes live', () => {
    const expired = anInstance().withStatus(InstanceStatus.Expired).withExpiry(IN_AN_HOUR).withReleases(aReleaseRecord()).build()

    expect(statusAfterSweep(expired)).toBe(InstanceStatus.Expired)
  })

  it('moves a provisioning instance to ready when its latest release is live', () => {
    const provisioning = anInstance().withStatus(InstanceStatus.Provisioning).withReleases(aReleaseRecord({ status: ReleaseStatus.Live })).build()

    expect(statusAfterSweep(provisioning)).toBe(InstanceStatus.Ready)
  })

  it('degrades an instance whose latest release failed, even one still provisioning', () => {
    const failed = aReleaseRecord({ status: ReleaseStatus.Failed })
    const statuses = [InstanceStatus.Provisioning, InstanceStatus.Ready].map((status) => statusAfterSweep(anInstance().withStatus(status).withReleases(failed).build()))

    expect(statuses).toEqual([InstanceStatus.Degraded, InstanceStatus.Degraded])
  })

  it('returns a degraded instance to ready when a later release is live', () => {
    const degraded = anInstance()
      .withStatus(InstanceStatus.Degraded)
      .withReleases(aReleaseRecord({ id: 'L2', status: ReleaseStatus.Live }), aReleaseRecord({ id: 'L1', status: ReleaseStatus.Failed }))
      .build()

    expect(statusAfterSweep(degraded)).toBe(InstanceStatus.Ready)
  })

  it('never expires an instance with no expiry', () => {
    expect(statusAfterSweep(anInstance().withExpiry(null).withReleases(aReleaseRecord()).build())).toBe(InstanceStatus.Ready)
  })

  it('leaves the status alone while the latest release is still queued or building', () => {
    const statuses = [ReleaseStatus.Queued, ReleaseStatus.Building].map((status) =>
      statusAfterSweep(anInstance().withStatus(InstanceStatus.Provisioning).withReleases(aReleaseRecord({ status })).build()),
    )

    expect(statuses).toEqual([InstanceStatus.Provisioning, InstanceStatus.Provisioning])
  })
})

describe('isRunning', () => {
  it('counts every status but expired and torn down as running', () => {
    expect(Object.values(InstanceStatus).filter(isRunning)).toEqual([InstanceStatus.Provisioning, InstanceStatus.Ready, InstanceStatus.Degraded])
  })
})
