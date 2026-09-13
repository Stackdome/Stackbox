import { CoarseStatus, PrState, TaskPhase, TaskResolution } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { makeTaskSummary } from '../../../.storybook/fixtures'
import { CHANGE_REQUEST_TITLE, COARSE_STATUS_LABEL, toTask } from './task'

describe('toTask', () => {
  it('labels every coarse status with its screen word', () => {
    expect(COARSE_STATUS_LABEL).toEqual({
      [CoarseStatus.Running]: 'Running',
      [CoarseStatus.NeedsYou]: 'Needs you',
      [CoarseStatus.ReadyForReview]: 'Ready for review',
      [CoarseStatus.Failed]: 'Failed',
      [CoarseStatus.Cancelled]: 'Cancelled',
    })
  })

  it('shows the phase as the meta line of a running task on its first run', () => {
    expect(toTask(makeTaskSummary({ phase: TaskPhase.Reproducing, run_number: 1 })).phaseLine).toBe('Reproducing')
  })

  it('prefixes the phase with the run once a second run starts', () => {
    expect(toTask(makeTaskSummary({ phase: TaskPhase.Deploying, run_number: 2, run_limit: 2 })).phaseLine).toBe('Run 2 of 2: deploying')
  })

  it('counts the runs used against the run limit', () => {
    expect(toTask(makeTaskSummary({ run_number: 1, run_limit: 2 })).runLabel).toBe('Run 1 of 2')
  })

  it('labels the resolution of a finished task', () => {
    const summary = makeTaskSummary({ phase: TaskPhase.HandOver, coarse_status: CoarseStatus.ReadyForReview, resolution: TaskResolution.NoChangeNeeded })

    expect(toTask(summary).resolutionLabel).toBe('No change needed')
  })

  it('names the pull request chip by repository short name and number', () => {
    const summary = makeTaskSummary({ pull_request: { number: 142, repository_short_name: 'shop', state: PrState.Merged, is_draft: false } })

    expect(toTask(summary).pullRequest?.label).toBe('shop #142')
  })

  it('titles a task without a report as a change request', () => {
    expect(toTask(makeTaskSummary({ report: null })).title).toBe(CHANGE_REQUEST_TITLE)
  })

  it('offers cancel only while the task is running', () => {
    const cancellable = [CoarseStatus.Running, CoarseStatus.NeedsYou, CoarseStatus.Failed].map(
      (status) => toTask(makeTaskSummary({ coarse_status: status })).cancellable,
    )

    expect(cancellable).toEqual([true, false, false])
  })
})
