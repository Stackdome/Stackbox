import type { components } from '@stackbox/contract'
import type { ReleaseRecord } from '../instances/types'

export function presentRelease(release: ReleaseRecord): components['schemas']['Release'] {
  return {
    id: release.id,
    commit_sha: release.commitSha,
    ref: release.ref,
    status: release.status,
    run_number: release.runNumber,
    created_at: release.createdAt.toISOString(),
  }
}
