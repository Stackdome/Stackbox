import { TaskPhase } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { canTransition, isTerminal } from './phase-transitions'

const TERMINAL = [TaskPhase.HandOver, TaskPhase.Failed, TaskPhase.Cancelled]

describe('task phase transitions', () => {
  it('lets an intake task start preparing', () => {
    expect(canTransition(TaskPhase.Intake, TaskPhase.Preparing)).toBe(true)
  })

  it('refuses to skip from intake straight to verifying', () => {
    expect(canTransition(TaskPhase.Intake, TaskPhase.Verifying)).toBe(false)
  })

  it('lets a failed verification go back to implementing', () => {
    expect(canTransition(TaskPhase.Verifying, TaskPhase.Implementing)).toBe(true)
  })

  it('lets implementing hand over once the run limit is exhausted', () => {
    expect(canTransition(TaskPhase.Implementing, TaskPhase.HandOver)).toBe(true)
  })

  it('refuses to hand over straight from deploying', () => {
    expect(canTransition(TaskPhase.Deploying, TaskPhase.HandOver)).toBe(false)
  })

  it('lets a waiting task return to a working phase', () => {
    expect(canTransition(TaskPhase.NeedsInput, TaskPhase.Deploying)).toBe(true)
  })

  it('allows no transition out of a terminal phase', () => {
    const exits = TERMINAL.flatMap((from) => Object.values(TaskPhase).filter((to) => canTransition(from, to)))
    expect(exits).toEqual([])
  })

  it('treats hand_over, failed and cancelled as the only terminal phases', () => {
    expect(Object.values(TaskPhase).filter(isTerminal)).toEqual(TERMINAL)
  })
})
