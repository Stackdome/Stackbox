import {
  CheckKind,
  CheckOutcome,
  ExecutionStatus,
  ReleaseStatus,
  RunOutcome,
  TaskPhase,
  TaskResolution,
} from '@stackbox/contract'
import { AgentErrorCategory, type AgentEvent, AgentEventKind, type CheckArtifact, EnvironmentStatus } from '../../ports'
import { costOf, wouldExceedBudget } from '../../tasks/calc/budget'
import { isTerminal } from '../../tasks/calc/phase-transitions'
import { reproKey, runKey, verifyKey } from '../../tasks/calc/idempotency-key'
import type { Execution, Release, Run } from '../../tasks/types'
import type { ExecutionPatch, TaskSnapshot } from '../task-state'
import { RunPurpose } from './run-spec'

export type Observations = {
  // Head of the target branch, read while the task has an instance and no release.
  headSha: string | null
  // Status of the latest release of the task's instance.
  releaseStatus: ReleaseStatus | null
  instanceUrl: string | null
  // Items of the active execution after its stored cursor.
  events: AgentEvent[]
}

export const DecisionKind = {
  CreateInstance: 'create_instance',
  DeployRelease: 'deploy_release',
  OpenRun: 'open_run',
  CloseRun: 'close_run',
  StartRun: 'start_run',
  RetrySameKey: 'retry_same_key',
  RecordExecution: 'record_execution',
  AppendCheck: 'append_check',
  IgnoreCheck: 'ignore_check',
  PushPatch: 'push_patch',
  OpenPullRequest: 'open_pull_request',
  Transition: 'transition',
  FailBudgetExceeded: 'fail_budget_exceeded',
  CancelRun: 'cancel_run',
  DeleteSession: 'delete_session',
  DestroySandbox: 'destroy_sandbox',
  TeardownInstance: 'teardown_instance',
  Complete: 'complete',
} as const
export type DecisionKind = (typeof DecisionKind)[keyof typeof DecisionKind]

export type Decision =
  | { kind: typeof DecisionKind.CreateInstance }
  | { kind: typeof DecisionKind.DeployRelease; commitSha: string; runId: string | null }
  | { kind: typeof DecisionKind.OpenRun; number: number }
  | { kind: typeof DecisionKind.CloseRun; runId: string; outcome: RunOutcome; verifiedSha: string | null }
  | {
      kind: typeof DecisionKind.StartRun
      key: string
      purpose: RunPurpose
      runNumber: number | null
      instanceUrl: string | null
      costCents: number
    }
  | { kind: typeof DecisionKind.RetrySameKey; executionId: string; purpose: RunPurpose; instanceUrl: string | null; costCents: number }
  | { kind: typeof DecisionKind.RecordExecution; executionId: string; patch: ExecutionPatch }
  | {
      kind: typeof DecisionKind.AppendCheck
      checkKind: CheckKind
      outcome: CheckOutcome
      executionId: string | null
      itemId: string | null
      runId: string | null
      releaseId: string | null
      commitSha: string | null
      artifacts: CheckArtifact[]
    }
  | { kind: typeof DecisionKind.IgnoreCheck; checkKind: CheckKind; executionId: string; itemId: string | null }
  | { kind: typeof DecisionKind.PushPatch; runId: string; executionId: string }
  | { kind: typeof DecisionKind.OpenPullRequest; runId: string }
  | { kind: typeof DecisionKind.Transition; to: TaskPhase; resolution: TaskResolution | null }
  | { kind: typeof DecisionKind.FailBudgetExceeded; resolution: TaskResolution.Abandoned; costCents: number }
  | { kind: typeof DecisionKind.CancelRun; executionId: string; sessionId: string }
  | { kind: typeof DecisionKind.DeleteSession; sessionId: string }
  | { kind: typeof DecisionKind.DestroySandbox; sandboxId: string }
  | { kind: typeof DecisionKind.TeardownInstance; instanceId: string }
  | { kind: typeof DecisionKind.Complete }

type AppendCheck = Extract<Decision, { kind: typeof DecisionKind.AppendCheck }>
type CheckEvent = Extract<AgentEvent, { kind: typeof AgentEventKind.Check }>
// Every event that ends the execution's turn, reduced to how it ended.
type TurnEnd =
  | { kind: typeof AgentEventKind.TurnCompleted; costCents: number }
  | { kind: typeof AgentEventKind.TurnFailed; category: AgentErrorCategory; costCents: number; status: ExecutionStatus }
type FailedTurn = Extract<TurnEnd, { kind: typeof AgentEventKind.TurnFailed }>
type RunStart = { key: string; purpose: RunPurpose; runNumber: number | null; instanceUrl: string | null }

type Context = {
  snapshot: TaskSnapshot
  observations: Observations
  execution: Execution | undefined
  turnEnd: TurnEnd | undefined
  checks: AppendCheck[]
  spent: number
}

const ACTIVE: readonly ExecutionStatus[] = [ExecutionStatus.Starting, ExecutionStatus.Running]

// An active execution only exists in the three run phases.
const PURPOSE_BY_PHASE: Partial<Record<TaskPhase, RunPurpose>> = {
  [TaskPhase.Reproducing]: RunPurpose.Reproduce,
  [TaskPhase.Implementing]: RunPurpose.Implement,
  [TaskPhase.Verifying]: RunPurpose.Verify,
}

// The one check kind each run purpose may report; instance_ready is written only from the deploy target.
const REPORTABLE_BY_PURPOSE: Partial<Record<RunPurpose, CheckKind>> = {
  [RunPurpose.Reproduce]: CheckKind.ReportReproduced,
  [RunPurpose.Verify]: CheckKind.FixVerified,
}

type RunScope = Pick<TaskSnapshot, 'task' | 'runs' | 'executions'>

// Deploying and verifying act on the latest run that has pushed a candidate.
function candidateRun(snapshot: Pick<TaskSnapshot, 'runs'>): Run | undefined {
  return snapshot.runs.filter((run) => run.candidateSha !== null).at(-1)
}

function currentKey(snapshot: RunScope): string | undefined {
  const taskId = snapshot.task.id
  switch (snapshot.task.phase) {
    case TaskPhase.Reproducing:
      return reproKey(taskId)
    case TaskPhase.Implementing: {
      const run = snapshot.runs.at(-1)
      return run && runKey(taskId, run.number)
    }
    case TaskPhase.Verifying: {
      const run = candidateRun(snapshot)
      return run && verifyKey(taskId, run.number)
    }
    default:
      return undefined
  }
}

// Only the execution keyed for the current phase is observed, so a replayed batch never reads an earlier run's items.
export function activeExecution(snapshot: RunScope): Execution | undefined {
  const key = currentKey(snapshot)
  return snapshot.executions.find(
    (candidate) => candidate.idempotencyKey === key && candidate.sessionRef !== null && ACTIVE.includes(candidate.status),
  )
}

export function decide(snapshot: TaskSnapshot, observations: Observations, now: Date): Decision[] {
  if (isTerminal(snapshot.task.phase)) return cleanUp(snapshot)
  const execution = activeExecution(snapshot)
  const turnEnd = execution && observations.events.map(turnEndOf).find((end) => end !== undefined)
  const reported = execution ? observations.events.filter(isCheck).filter((event) => !isStored(snapshot, execution, event)) : []
  const purpose = PURPOSE_BY_PHASE[snapshot.task.phase]
  const reportable = purpose && REPORTABLE_BY_PURPOSE[purpose]
  const checks = execution
    ? reported.filter((event) => event.checkKind === reportable).map((event) => checkFromEvent(snapshot, execution, event))
    : []
  const ignored: Decision[] = execution
    ? reported
      .filter((event) => event.checkKind !== reportable)
      .map((event) => ({ kind: DecisionKind.IgnoreCheck, checkKind: event.checkKind, executionId: execution.id, itemId: event.itemId ?? null }))
    : []
  const context: Context = {
    snapshot,
    observations,
    execution,
    turnEnd,
    checks,
    spent: costOf(snapshot.executions) + (execution && turnEnd ? turnEnd.costCents : 0),
  }
  const retrying = turnEnd?.kind === AgentEventKind.TurnFailed && turnEnd.category === AgentErrorCategory.Transient
  const record = execution && observations.events.length > 0 && !retrying ? [recordExecution(execution, observations.events, turnEnd, now)] : []
  return [...checks, ...ignored, ...advance(context), ...record]
}

function advance(c: Context): Decision[] {
  if (c.execution && c.turnEnd?.kind === AgentEventKind.TurnFailed) return afterFailedTurn(c, c.execution, c.turnEnd)
  switch (c.snapshot.task.phase) {
    case TaskPhase.Intake:
      return c.snapshot.task.instanceId === null
        ? [{ kind: DecisionKind.CreateInstance }, transition(TaskPhase.Preparing)]
        : [transition(TaskPhase.Preparing)]
    case TaskPhase.Preparing:
      return preparing(c)
    case TaskPhase.Reproducing:
      return reproducing(c)
    case TaskPhase.Implementing:
      return implementing(c)
    case TaskPhase.Deploying:
      return deploying(c)
    case TaskPhase.Verifying:
      return verifying(c)
    default:
      return []
  }
}

function afterFailedTurn(c: Context, execution: Execution, turnEnd: FailedTurn): Decision[] {
  if (turnEnd.category !== AgentErrorCategory.Transient) return [transition(TaskPhase.Failed)]
  if (overBudget(c)) return [failBudget(c)]
  return [
    {
      kind: DecisionKind.RetrySameKey,
      executionId: execution.id,
      purpose: PURPOSE_BY_PHASE[c.snapshot.task.phase] ?? RunPurpose.Implement,
      instanceUrl: c.observations.instanceUrl,
      costCents: execution.costCents + turnEnd.costCents,
    },
  ]
}

function preparing(c: Context): Decision[] {
  const release = c.snapshot.releases.at(-1)
  if (!release) {
    return c.observations.headSha === null ? [] : [{ kind: DecisionKind.DeployRelease, commitSha: c.observations.headSha, runId: null }]
  }
  if (c.observations.releaseStatus === ReleaseStatus.Failed) return [transition(TaskPhase.Failed)]
  if (c.observations.releaseStatus !== ReleaseStatus.Live) return []
  const alreadyReady = c.snapshot.checks.some((check) => check.kind === CheckKind.InstanceReady && check.releaseId === release.id)
  const ready: Decision[] = alreadyReady ? [] : [instanceReady(release)]
  const start: RunStart = { key: reproKey(c.snapshot.task.id), purpose: RunPurpose.Reproduce, runNumber: null, instanceUrl: null }
  return startingRun(c, start, ready, [transition(TaskPhase.Reproducing)])
}

function reproducing(c: Context): Decision[] {
  if (c.turnEnd?.kind !== AgentEventKind.TurnCompleted) return []
  if (latestOutcome(c, CheckKind.ReportReproduced) !== CheckOutcome.Passed) {
    return [transition(TaskPhase.HandOver, TaskResolution.NotReproduced)]
  }
  const opened: Decision[] = c.snapshot.runs.some((run) => run.number === 1) ? [] : [{ kind: DecisionKind.OpenRun, number: 1 }]
  const start: RunStart = { key: runKey(c.snapshot.task.id, 1), purpose: RunPurpose.Implement, runNumber: 1, instanceUrl: null }
  return startingRun(c, start, opened, [transition(TaskPhase.Implementing)])
}

function implementing(c: Context): Decision[] {
  const run = runOf(c)
  if (c.turnEnd?.kind !== AgentEventKind.TurnCompleted || !c.execution || !run) return []
  return [{ kind: DecisionKind.PushPatch, runId: run.id, executionId: c.execution.id }, transition(TaskPhase.Deploying)]
}

function deploying(c: Context): Decision[] {
  const run = candidateRun(c.snapshot)
  if (!run || run.candidateSha === null) return []
  const release = c.snapshot.releases.filter((candidate) => candidate.runId === run.id).at(-1)
  if (!release) return [{ kind: DecisionKind.DeployRelease, commitSha: run.candidateSha, runId: run.id }]
  if (c.observations.releaseStatus === ReleaseStatus.Failed) return nextRunOrHandOver(c, run, TaskPhase.Deploying)
  if (c.observations.releaseStatus !== ReleaseStatus.Live || c.observations.instanceUrl === null) return []
  const start: RunStart = {
    key: verifyKey(c.snapshot.task.id, run.number),
    purpose: RunPurpose.Verify,
    runNumber: run.number,
    instanceUrl: c.observations.instanceUrl,
  }
  return startingRun(c, start, [], [transition(TaskPhase.Verifying)])
}

function verifying(c: Context): Decision[] {
  const run = runOf(c)
  if (c.turnEnd?.kind !== AgentEventKind.TurnCompleted || !run) return []
  if (latestOutcome(c, CheckKind.FixVerified) !== CheckOutcome.Passed) return nextRunOrHandOver(c, run, TaskPhase.Verifying)
  const pullRequest: Decision[] = c.snapshot.pullRequest === null ? [{ kind: DecisionKind.OpenPullRequest, runId: run.id }] : []
  return [...closeRun(run, RunOutcome.Passed, run.candidateSha), ...pullRequest, transition(TaskPhase.HandOver, TaskResolution.FixVerified)]
}

function nextRunOrHandOver(c: Context, run: Run, from: typeof TaskPhase.Deploying | typeof TaskPhase.Verifying): Decision[] {
  const closed = closeRun(run, RunOutcome.Failed, null)
  if (run.number < c.snapshot.task.runLimit) {
    const next = run.number + 1
    const opened: Decision[] = c.snapshot.runs.some((candidate) => candidate.number === next) ? [] : [{ kind: DecisionKind.OpenRun, number: next }]
    const start: RunStart = { key: runKey(c.snapshot.task.id, next), purpose: RunPurpose.Implement, runNumber: next, instanceUrl: null }
    return startingRun(c, start, [...closed, ...opened], [transition(TaskPhase.Implementing)])
  }
  const handOver = transition(TaskPhase.HandOver, TaskResolution.FixUnverified)
  // Spec 4.3 has no deploying to hand_over edge; an exhausted run limit hands over out of implementing.
  return from === TaskPhase.Deploying ? [...closed, transition(TaskPhase.Implementing), handOver] : [...closed, handOver]
}

function closeRun(run: Run, outcome: RunOutcome, verifiedSha: string | null): Decision[] {
  return run.outcome === RunOutcome.Running ? [{ kind: DecisionKind.CloseRun, runId: run.id, outcome, verifiedSha }] : []
}

function runOf(c: Context): Run | undefined {
  return c.snapshot.runs.find((run) => run.id === c.execution?.runId)
}

function startingRun(c: Context, start: RunStart, before: Decision[], after: Decision[]): Decision[] {
  const hasSession = c.snapshot.executions.some((execution) => execution.idempotencyKey === start.key && execution.sessionRef !== null)
  if (hasSession) return [...before, ...after]
  if (overBudget(c)) return [...before, failBudget(c)]
  return [...before, { kind: DecisionKind.StartRun, ...start, costCents: c.spent }, ...after]
}

// Runs once per terminal task, before completedAt stops it being claimed; a handed over instance stays up for review.
function cleanUp(snapshot: TaskSnapshot): Decision[] {
  const cancels: Decision[] = snapshot.executions.flatMap((execution) =>
    execution.sessionRef !== null && ACTIVE.includes(execution.status)
      ? [{ kind: DecisionKind.CancelRun, executionId: execution.id, sessionId: execution.sessionRef }]
      : [],
  )
  const sessions = new Set(snapshot.executions.flatMap((execution) => (execution.sessionRef === null ? [] : [execution.sessionRef])))
  const deletes: Decision[] = [...sessions].map((sessionId) => ({ kind: DecisionKind.DeleteSession, sessionId }))
  const destroys: Decision[] = snapshot.sandboxes
    .filter((sandbox) => sandbox.externalId !== null && sandbox.stoppedAt === null)
    .map((sandbox) => ({ kind: DecisionKind.DestroySandbox, sandboxId: sandbox.id }))
  const { instanceId, phase } = snapshot.task
  const teardown: Decision[] = phase === TaskPhase.HandOver || instanceId === null ? [] : [{ kind: DecisionKind.TeardownInstance, instanceId }]
  return [...cancels, ...deletes, ...destroys, ...teardown, { kind: DecisionKind.Complete }]
}

function recordExecution(execution: Execution, events: AgentEvent[], turnEnd: TurnEnd | undefined, now: Date): Decision {
  const ended: ExecutionPatch =
    turnEnd === undefined
      ? {}
      : {
        status: turnEnd.kind === AgentEventKind.TurnCompleted ? ExecutionStatus.Succeeded : turnEnd.status,
        costCents: execution.costCents + turnEnd.costCents,
        endedAt: now,
      }
  return {
    kind: DecisionKind.RecordExecution,
    executionId: execution.id,
    patch: { eventCursor: events.at(-1)?.itemId ?? execution.eventCursor, ...ended },
  }
}

function isStored(snapshot: TaskSnapshot, execution: Execution, event: CheckEvent): boolean {
  return snapshot.checks.some((check) => check.executionId === execution.id && check.itemId !== null && check.itemId === event.itemId)
}

function checkFromEvent(snapshot: TaskSnapshot, execution: Execution, event: CheckEvent): AppendCheck {
  const release = snapshot.releases.at(-1)
  return {
    kind: DecisionKind.AppendCheck,
    checkKind: event.checkKind,
    outcome: event.outcome,
    executionId: execution.id,
    itemId: event.itemId ?? null,
    runId: execution.runId,
    releaseId: release?.id ?? null,
    commitSha: release?.commitSha ?? null,
    artifacts: event.artifacts,
  }
}

function instanceReady(release: Release): AppendCheck {
  return {
    kind: DecisionKind.AppendCheck,
    checkKind: CheckKind.InstanceReady,
    outcome: CheckOutcome.Passed,
    executionId: null,
    itemId: null,
    runId: null,
    releaseId: release.id,
    commitSha: release.commitSha,
    artifacts: [],
  }
}

function latestOutcome(c: Context, kind: CheckKind): CheckOutcome | null {
  const stored = c.snapshot.checks
    .filter((check) => check.kind === kind && check.executionId === c.execution?.id)
    .map((check) => check.outcome)
  const observed = c.checks.filter((check) => check.checkKind === kind).map((check) => check.outcome)
  return [...stored, ...observed].at(-1) ?? null
}

function overBudget(c: Context): boolean {
  return wouldExceedBudget({
    spent: c.spent,
    taskBudgetCents: c.snapshot.task.budgetCents,
    orgBudgetCents: c.snapshot.organization.budgetCents,
  })
}

function failBudget(c: Context): Decision {
  return { kind: DecisionKind.FailBudgetExceeded, resolution: TaskResolution.Abandoned, costCents: c.spent }
}

function transition(to: TaskPhase, resolution: TaskResolution | null = null): Decision {
  return { kind: DecisionKind.Transition, to, resolution }
}

function isCheck(event: AgentEvent): event is CheckEvent {
  return event.kind === AgentEventKind.Check
}

function turnEndOf(event: AgentEvent): TurnEnd | undefined {
  const permanent = (status: ExecutionStatus): FailedTurn => ({
    kind: AgentEventKind.TurnFailed,
    category: AgentErrorCategory.Permanent,
    costCents: 0,
    status,
  })
  switch (event.kind) {
    case AgentEventKind.TurnCompleted:
      return { kind: event.kind, costCents: event.costCents }
    case AgentEventKind.TurnFailed:
      return { kind: event.kind, category: event.category, costCents: event.costCents, status: ExecutionStatus.Failed }
    case AgentEventKind.TurnCancelled:
      return permanent(ExecutionStatus.Cancelled)
    case AgentEventKind.SessionFailed:
      return permanent(ExecutionStatus.Failed)
    case AgentEventKind.Environment:
      return event.status === EnvironmentStatus.Failed ? permanent(ExecutionStatus.Failed) : undefined
    default:
      return undefined
  }
}
