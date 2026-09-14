import { TaskPhase } from '@stackbox/contract'
import { STEP_LABEL, STEP_PHASES, type TaskDetailView } from '@/api/mappers/task-detail'
import type { Stage, StageStatus } from '@/components/branded'

// A diversion is a state on the step it left, never a step of its own.
const DIVERSION_STATUS: Partial<Record<TaskPhase, StageStatus>> = {
  [TaskPhase.NeedsInput]: 'paused',
  [TaskPhase.Failed]: 'failed',
  [TaskPhase.Cancelled]: 'skipped',
}

const WORKING: readonly TaskPhase[] = STEP_PHASES

export function stagesFor({ phase, divertedFrom }: Pick<TaskDetailView, 'phase' | 'divertedFrom'>): Stage[] {
  const current = WORKING.includes(phase) ? phase : (divertedFrom ?? TaskPhase.Intake)
  const index = WORKING.indexOf(current)
  const here: StageStatus = phase === TaskPhase.HandOver ? 'done' : (DIVERSION_STATUS[phase] ?? 'active')
  return WORKING.map((step, i) => ({
    key: step,
    label: STEP_LABEL[step],
    status: i < index ? 'done' : i === index ? here : 'todo',
  }))
}
