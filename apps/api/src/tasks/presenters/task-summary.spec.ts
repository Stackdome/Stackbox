import { CoarseStatus, PrState, TaskPhase } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { aTaskListRow } from '../test-support/builders'
import { presentTaskSummary } from './task-summary'

describe('presentTaskSummary', () => {
  it('derives the coarse status from the phase', () => {
    expect(presentTaskSummary(aTaskListRow({ task: { phase: TaskPhase.HandOver } })).coarse_status).toBe(CoarseStatus.ReadyForReview)
  })

  it('names the pull request by the repository short name', () => {
    const row = aTaskListRow({ pullRequest: { number: 142, isDraft: false, state: PrState.Merged, repositoryFullName: 'acme/shop' } })

    expect(presentTaskSummary(row).pull_request).toEqual({ number: 142, repository_short_name: 'shop', state: PrState.Merged, is_draft: false })
  })
})
