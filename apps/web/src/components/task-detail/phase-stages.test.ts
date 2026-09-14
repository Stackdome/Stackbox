import { TaskPhase } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { stagesFor } from './phase-stages'

const statuses = (phase: TaskPhase, divertedFrom: TaskPhase | null = null) => stagesFor({ phase, divertedFrom }).map((stage) => stage.status)

describe('the phase stepper', () => {
  it('marks the steps before a running phase done and the phase itself in flight', () => {
    expect(statuses(TaskPhase.Reproducing)).toEqual(['done', 'done', 'active', 'todo', 'todo', 'todo', 'todo'])
  })

  it('pauses on the step a waiting task diverted from', () => {
    expect(statuses(TaskPhase.NeedsInput, TaskPhase.Implementing)).toEqual(['done', 'done', 'done', 'paused', 'todo', 'todo', 'todo'])
  })

  it('fails on the step a failed task stopped at', () => {
    expect(statuses(TaskPhase.Failed, TaskPhase.Verifying)).toEqual(['done', 'done', 'done', 'done', 'done', 'failed', 'todo'])
  })

  it('leaves a cancelled task on its step as skipped', () => {
    expect(statuses(TaskPhase.Cancelled, TaskPhase.Implementing)).toEqual(['done', 'done', 'done', 'skipped', 'todo', 'todo', 'todo'])
  })

  it('completes every step once the task is handed over', () => {
    expect(statuses(TaskPhase.HandOver)).toEqual(['done', 'done', 'done', 'done', 'done', 'done', 'done'])
  })

  it('labels the seven working steps and never a diversion', () => {
    expect(stagesFor({ phase: TaskPhase.NeedsInput, divertedFrom: TaskPhase.Implementing }).map((stage) => stage.label)).toEqual([
      'Intake',
      'Preparing',
      'Reproducing',
      'Implementing',
      'Deploying',
      'Verifying',
      'Hand over',
    ])
  })
})
