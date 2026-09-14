import { ReleaseStatus } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { advancedStatus, isInFlight } from './release-progress'

describe('advancedStatus', () => {
  it('moves a queued release to building and a building one to live or failed', () => {
    expect([
      advancedStatus(ReleaseStatus.Queued, ReleaseStatus.Building),
      advancedStatus(ReleaseStatus.Building, ReleaseStatus.Live),
      advancedStatus(ReleaseStatus.Building, ReleaseStatus.Failed),
    ]).toEqual([ReleaseStatus.Building, ReleaseStatus.Live, ReleaseStatus.Failed])
  })

  it('never moves a building release back to queued', () => {
    expect(advancedStatus(ReleaseStatus.Building, ReleaseStatus.Queued)).toBe(ReleaseStatus.Building)
  })

  it('keeps a settled release where it settled whatever the provider reads later', () => {
    expect([advancedStatus(ReleaseStatus.Live, ReleaseStatus.Failed), advancedStatus(ReleaseStatus.Failed, ReleaseStatus.Live)]).toEqual([
      ReleaseStatus.Live,
      ReleaseStatus.Failed,
    ])
  })
})

describe('isInFlight', () => {
  it('counts queued and building releases as in flight', () => {
    expect(Object.values(ReleaseStatus).filter(isInFlight)).toEqual([ReleaseStatus.Queued, ReleaseStatus.Building])
  })
})
