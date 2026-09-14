import { CoarseStatus, InstancePurpose, ReleaseStatus, TaskPhase } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { presentDetail, presentListItem } from './presenters'
import { aReleaseRecord, anInstance } from './test-support/builders'

describe('presentListItem', () => {
  it('names the owning task with its coarse status and no owner for a task instance', () => {
    const record = anInstance().ownedByTask({ id: 'T1', description: 'Checkout button does nothing', phase: TaskPhase.NeedsInput }).build()

    const item = presentListItem(record)

    expect([item.purpose, item.owner, item.task]).toEqual([
      InstancePurpose.Task,
      null,
      { id: 'T1', description: 'Checkout button does nothing', coarse_status: CoarseStatus.NeedsYou },
    ])
  })

  it('carries the newest release as the latest release and no expiry as null', () => {
    const record = anInstance()
      .withExpiry(null)
      .withReleases(aReleaseRecord({ id: 'L2', status: ReleaseStatus.Building }), aReleaseRecord({ id: 'L1' }))
      .build()

    const item = presentListItem(record)

    expect([item.latest_release?.id, item.latest_release?.status, item.expires_at]).toEqual(['L2', ReleaseStatus.Building, null])
  })
})

describe('presentDetail', () => {
  it('adds the repository and every release, newest first', () => {
    const record = anInstance().withReleases(aReleaseRecord({ id: 'L2' }), aReleaseRecord({ id: 'L1' })).build()

    const detail = presentDetail(record)

    expect([detail.repository, detail.releases.map((release) => release.id)]).toEqual([
      { id: 'R1', full_name: 'acme/shop', default_branch: 'main' },
      ['L2', 'L1'],
    ])
  })
})
