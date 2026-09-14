import { CoarseStatus, InstanceStatus, PrState, TaskPhase } from '@stackbox/contract'
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

  it('carries the instance the task points at with its status and expiry', () => {
    const row = aTaskListRow({ instance: { id: 'I1', url: 'https://i1.instances.test', status: InstanceStatus.Ready, expiresAt: new Date('2026-09-17T10:00:00Z') } })

    expect(presentTaskSummary(row).instance).toEqual({ id: 'I1', url: 'https://i1.instances.test', status: InstanceStatus.Ready, expires_at: '2026-09-17T10:00:00.000Z' })
  })
})
