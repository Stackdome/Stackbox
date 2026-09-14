import { ReleaseStatus } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { aReleaseRecord } from '../instances/test-support/builders'
import { presentRelease } from './presenters'

describe('presentRelease', () => {
  it('says which run opened a release and when', () => {
    const release = aReleaseRecord({ id: 'L2', status: ReleaseStatus.Building, runNumber: 2, createdAt: new Date('2026-09-14T10:05:00Z') })

    expect(presentRelease(release)).toEqual({
      id: 'L2',
      commit_sha: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
      ref: 'main',
      status: ReleaseStatus.Building,
      run_number: 2,
      created_at: '2026-09-14T10:05:00.000Z',
    })
  })
})
