import { TaskEventKind, TaskPhase } from '@stackbox/contract'
import type { TaskEvent } from '../types'

// The diverted-from phase lives only in the phase_changed payload; events arrive oldest first.
export function phaseAfterReply(phase: TaskPhase, events: readonly TaskEvent[]): TaskPhase | null {
  if (phase !== TaskPhase.NeedsInput) return null
  const diversion = events.filter((event) => event.kind === TaskEventKind.PhaseChanged && event.payload.to === TaskPhase.NeedsInput).at(-1)
  return (diversion?.payload.from as TaskPhase | undefined) ?? null
}
