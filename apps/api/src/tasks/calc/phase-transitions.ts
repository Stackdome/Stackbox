import { TaskPhase } from '@stackbox/contract'

const EXITS = [TaskPhase.NeedsInput, TaskPhase.Failed, TaskPhase.Cancelled]

export const PHASE_TRANSITIONS: Readonly<Record<TaskPhase, readonly TaskPhase[]>> = {
  [TaskPhase.Intake]: [TaskPhase.Preparing, ...EXITS],
  [TaskPhase.Preparing]: [TaskPhase.Reproducing, ...EXITS],
  // hand_over here carries resolution not_reproduced or no_change_needed.
  [TaskPhase.Reproducing]: [TaskPhase.Implementing, TaskPhase.HandOver, ...EXITS],
  // verifying directly is for locally verifiable tasks; hand_over carries fix_unverified once run_limit is exhausted.
  [TaskPhase.Implementing]: [TaskPhase.Deploying, TaskPhase.Verifying, TaskPhase.HandOver, ...EXITS],
  [TaskPhase.Deploying]: [TaskPhase.Verifying, TaskPhase.Implementing, ...EXITS],
  [TaskPhase.Verifying]: [TaskPhase.HandOver, TaskPhase.Implementing, ...EXITS],
  // Which working phase a task diverted from is only known from its task_event history.
  [TaskPhase.NeedsInput]: [
    TaskPhase.Intake,
    TaskPhase.Preparing,
    TaskPhase.Reproducing,
    TaskPhase.Implementing,
    TaskPhase.Deploying,
    TaskPhase.Verifying,
    TaskPhase.Failed,
    TaskPhase.Cancelled,
  ],
  [TaskPhase.HandOver]: [],
  [TaskPhase.Failed]: [],
  [TaskPhase.Cancelled]: [],
}

export function canTransition(from: TaskPhase, to: TaskPhase): boolean {
  return PHASE_TRANSITIONS[from].includes(to)
}

export function isTerminal(phase: TaskPhase): boolean {
  return PHASE_TRANSITIONS[phase].length === 0
}
