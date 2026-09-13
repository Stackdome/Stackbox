import { CoarseStatus, TaskPhase } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { coarseStatusOf } from './coarse-status'
import { isTerminal } from './phase-transitions'

describe('coarse status', () => {
  it('derives needs_you from the needs_input phase and running from every non-terminal phase', () => {
    const working = Object.values(TaskPhase).filter((phase) => !isTerminal(phase) && phase !== TaskPhase.NeedsInput)

    expect({
      needsInput: coarseStatusOf(TaskPhase.NeedsInput),
      working: [...new Set(working.map(coarseStatusOf))],
    }).toEqual({ needsInput: CoarseStatus.NeedsYou, working: [CoarseStatus.Running] })
  })

  it('asks for the user when the task needs input', () => {
    expect(coarseStatusOf(TaskPhase.NeedsInput)).toBe(CoarseStatus.NeedsYou)
  })

  it('is ready for review once the task hands over', () => {
    expect(coarseStatusOf(TaskPhase.HandOver)).toBe(CoarseStatus.ReadyForReview)
  })

  it('is failed when the task failed', () => {
    expect(coarseStatusOf(TaskPhase.Failed)).toBe(CoarseStatus.Failed)
  })

  it('is cancelled when the task was cancelled', () => {
    expect(coarseStatusOf(TaskPhase.Cancelled)).toBe(CoarseStatus.Cancelled)
  })

  it('is running in every working phase', () => {
    const working = [
      TaskPhase.Intake,
      TaskPhase.Preparing,
      TaskPhase.Reproducing,
      TaskPhase.Implementing,
      TaskPhase.Deploying,
      TaskPhase.Verifying,
    ]
    expect(new Set(working.map(coarseStatusOf))).toEqual(new Set([CoarseStatus.Running]))
  })
})
