import { TaskEventKind, TaskPhase } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { aTaskEvent } from '../test-support/builders'
import { phaseAfterReply } from './reply'

const diverted = (from: TaskPhase, id: string) =>
  aTaskEvent({ id, kind: TaskEventKind.PhaseChanged, payload: { from, to: TaskPhase.NeedsInput } })

describe('replying to a task', () => {
  it('moves a task from needs_input to implementing when the reporter replies', () => {
    expect(phaseAfterReply(TaskPhase.NeedsInput, [diverted(TaskPhase.Implementing, 'V1')])).toBe(TaskPhase.Implementing)
  })

  it('resumes the phase of the latest diversion when the task needed input more than once', () => {
    const events = [diverted(TaskPhase.Preparing, 'V1'), diverted(TaskPhase.Verifying, 'V2')]

    expect(phaseAfterReply(TaskPhase.NeedsInput, events)).toBe(TaskPhase.Verifying)
  })

  it('leaves the phase alone when the task was not waiting on an answer', () => {
    expect(phaseAfterReply(TaskPhase.Implementing, [diverted(TaskPhase.Implementing, 'V1')])).toBeNull()
  })
})
