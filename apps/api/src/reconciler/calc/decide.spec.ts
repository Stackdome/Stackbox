import {
  CheckKind,
  CheckOutcome,
  ExecutionStatus,
  ReleaseStatus,
  RunOutcome,
  TaskPhase,
  TaskResolution,
} from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { AgentErrorCategory, type AgentEvent, AgentEventKind } from '../../ports'
import { type AgentEventBody, turnCompleted, turnFailed } from '../../ports/fakes'
import {
  aCheck,
  aRelease,
  aRun,
  aSandbox,
  aSnapshot,
  aTask,
  anExecution,
  anOrganization,
} from '../../tasks/test-support/builders'
import { type Decision, DecisionKind, type Observations, decide } from './decide'
import { RunPurpose } from './run-spec'

const NOW = new Date('2026-09-13T10:05:00Z')

function item(id: string, body: AgentEventBody): AgentEvent {
  return { ...body, eventId: id, itemId: id, sessionId: 'session-1', turnId: 'turn-1', at: NOW } as AgentEvent
}

function checkReported(checkKind: CheckKind, outcome: CheckOutcome): AgentEventBody {
  return { kind: AgentEventKind.Check, checkKind, outcome, artifacts: [] }
}

function observing(overrides: Partial<Observations> = {}): Observations {
  return { headSha: null, releaseStatus: null, instanceUrl: null, events: [], ...overrides }
}

function kinds(decisions: Decision[]): string[] {
  return decisions.map((decision) => decision.kind)
}

function transition(to: TaskPhase, resolution: TaskResolution | null = null): Decision {
  return { kind: DecisionKind.Transition, to, resolution }
}

const origin = aRelease({ id: 'release-1', commitSha: 'origin-sha' })
const candidate = aRelease({ id: 'release-2', runId: 'T1-run1', commitSha: 'pushed-sha-1' })

describe('decide', () => {
  it('abandons a task with resolution abandoned when the next run would cross the organization budget', () => {
    const snapshot = aSnapshot({
      organization: anOrganization({ budgetCents: 500 }),
      task: aTask({ phase: TaskPhase.Reproducing, instanceId: 'instance-1' }),
      releases: [origin],
      sandboxes: [aSandbox()],
      executions: [anExecution({ idempotencyKey: 'T1:repro', costCents: 0 })],
    })
    const events = [
      item('item-1', checkReported(CheckKind.ReportReproduced, CheckOutcome.Passed)),
      item('item-2', turnCompleted(500)),
    ]
    const decisions = decide(snapshot, observing({ events }), NOW)
    const runOrBudget = decisions.filter(
      (decision) => decision.kind === DecisionKind.StartRun || decision.kind === DecisionKind.FailBudgetExceeded,
    )
    expect(runOrBudget).toEqual([
      { kind: DecisionKind.FailBudgetExceeded, resolution: TaskResolution.Abandoned, costCents: 500 },
    ])
  })

  it('requests an instance and starts preparing an intake task', () => {
    expect(decide(aSnapshot(), observing(), NOW)).toEqual([
      { kind: DecisionKind.CreateInstance },
      transition(TaskPhase.Preparing),
    ])
  })

  it('starts preparing without requesting a second instance when the task already has one', () => {
    const snapshot = aSnapshot({ task: aTask({ instanceId: 'instance-1' }) })
    expect(decide(snapshot, observing(), NOW)).toEqual([transition(TaskPhase.Preparing)])
  })

  it('fails a preparing task whose origin release failed', () => {
    const snapshot = aSnapshot({ task: aTask({ phase: TaskPhase.Preparing, instanceId: 'instance-1' }), releases: [origin] })
    expect(decide(snapshot, observing({ releaseStatus: ReleaseStatus.Failed }), NOW)).toEqual([transition(TaskPhase.Failed)])
  })

  it('deploys the target branch head once the instance exists', () => {
    const snapshot = aSnapshot({ task: aTask({ phase: TaskPhase.Preparing, instanceId: 'instance-1' }) })
    expect(decide(snapshot, observing({ headSha: 'origin-sha' }), NOW)).toEqual([
      { kind: DecisionKind.DeployRelease, commitSha: 'origin-sha', runId: null },
    ])
  })

  it('records instance_ready from the live origin release, then starts the repro run', () => {
    const snapshot = aSnapshot({ task: aTask({ phase: TaskPhase.Preparing, instanceId: 'instance-1' }), releases: [origin] })
    expect(decide(snapshot, observing({ releaseStatus: ReleaseStatus.Live }), NOW)).toEqual([
      {
        kind: DecisionKind.AppendCheck,
        checkKind: CheckKind.InstanceReady,
        outcome: CheckOutcome.Passed,
        executionId: null,
        itemId: null,
        runId: null,
        releaseId: 'release-1',
        commitSha: 'origin-sha',
        artifacts: [],
      },
      { kind: DecisionKind.StartRun, key: 'T1:repro', purpose: RunPurpose.Reproduce, runNumber: null, instanceUrl: null, costCents: 0 },
      transition(TaskPhase.Reproducing),
    ])
  })

  it('does not start a second run for an idempotency key that already has a session', () => {
    const snapshot = aSnapshot({
      task: aTask({ phase: TaskPhase.Preparing, instanceId: 'instance-1' }),
      releases: [origin],
      checks: [aCheck()],
      executions: [anExecution({ idempotencyKey: 'T1:repro', sessionRef: 'session-1' })],
    })
    expect(decide(snapshot, observing({ releaseStatus: ReleaseStatus.Live }), NOW)).toEqual([transition(TaskPhase.Reproducing)])
  })

  it('hands over with not_reproduced when the reproduction check failed', () => {
    const snapshot = aSnapshot({
      task: aTask({ phase: TaskPhase.Reproducing, instanceId: 'instance-1' }),
      releases: [origin],
      executions: [anExecution()],
    })
    const events = [item('item-1', checkReported(CheckKind.ReportReproduced, CheckOutcome.Failed)), item('item-2', turnCompleted())]
    expect(decide(snapshot, observing({ events }), NOW)).toContainEqual(transition(TaskPhase.HandOver, TaskResolution.NotReproduced))
  })

  it('opens run 1 and starts implementing once the report is reproduced', () => {
    const snapshot = aSnapshot({
      task: aTask({ phase: TaskPhase.Reproducing, instanceId: 'instance-1' }),
      releases: [origin],
      executions: [anExecution()],
    })
    const events = [item('item-1', checkReported(CheckKind.ReportReproduced, CheckOutcome.Passed)), item('item-2', turnCompleted())]
    expect(kinds(decide(snapshot, observing({ events }), NOW))).toEqual([
      DecisionKind.AppendCheck,
      DecisionKind.OpenRun,
      DecisionKind.StartRun,
      DecisionKind.Transition,
      DecisionKind.RecordExecution,
    ])
  })

  it('reads a check stored on an earlier tick when the turn completes', () => {
    const snapshot = aSnapshot({
      task: aTask({ phase: TaskPhase.Reproducing, instanceId: 'instance-1' }),
      releases: [origin],
      executions: [anExecution()],
      checks: [aCheck({ kind: CheckKind.ReportReproduced, executionId: 'E1' })],
    })
    const decisions = decide(snapshot, observing({ events: [item('item-3', turnCompleted())] }), NOW)
    expect(decisions).toContainEqual(transition(TaskPhase.Implementing))
  })

  it('pushes the patch and moves to deploying when the implementation turn completes', () => {
    const snapshot = aSnapshot({
      task: aTask({ phase: TaskPhase.Implementing, instanceId: 'instance-1' }),
      releases: [origin],
      runs: [aRun()],
      executions: [anExecution({ idempotencyKey: 'T1:run1', runId: 'T1-run1' })],
    })
    const decisions = decide(snapshot, observing({ events: [item('item-4', turnCompleted())] }), NOW)
    expect(decisions.slice(0, 2)).toEqual([{ kind: DecisionKind.PushPatch, runId: 'T1-run1', executionId: 'E1' }, transition(TaskPhase.Deploying)])
  })

  it('deploys the candidate sha of the current run', () => {
    const snapshot = aSnapshot({
      task: aTask({ phase: TaskPhase.Deploying, instanceId: 'instance-1' }),
      releases: [origin],
      runs: [aRun({ candidateSha: 'pushed-sha-1' })],
    })
    expect(decide(snapshot, observing({ releaseStatus: ReleaseStatus.Live }), NOW)).toEqual([
      { kind: DecisionKind.DeployRelease, commitSha: 'pushed-sha-1', runId: 'T1-run1' },
    ])
  })

  it('starts the verify run against the instance url once the candidate release is live', () => {
    const snapshot = aSnapshot({
      task: aTask({ phase: TaskPhase.Deploying, instanceId: 'instance-1' }),
      releases: [origin, candidate],
      runs: [aRun({ candidateSha: 'pushed-sha-1' })],
    })
    const observations = observing({ releaseStatus: ReleaseStatus.Live, instanceUrl: 'https://instance-1.instances.test' })
    expect(decide(snapshot, observations, NOW)).toEqual([
      {
        kind: DecisionKind.StartRun,
        key: 'T1:run1:verify',
        purpose: RunPurpose.Verify,
        runNumber: 1,
        instanceUrl: 'https://instance-1.instances.test',
        costCents: 0,
      },
      transition(TaskPhase.Verifying),
    ])
  })

  it('goes back to implementing with run 2 when the candidate release fails and runs remain', () => {
    const snapshot = aSnapshot({
      task: aTask({ phase: TaskPhase.Deploying, instanceId: 'instance-1', runLimit: 2 }),
      releases: [origin, candidate],
      runs: [aRun({ candidateSha: 'pushed-sha-1' })],
    })
    const decisions = decide(snapshot, observing({ releaseStatus: ReleaseStatus.Failed }), NOW)
    expect(decisions).toContainEqual({
      kind: DecisionKind.StartRun,
      key: 'T1:run2',
      purpose: RunPurpose.Implement,
      runNumber: 2,
      instanceUrl: null,
      costCents: 0,
    })
  })

  it('hands over with fix_unverified through implementing when the last run\'s release fails', () => {
    const snapshot = aSnapshot({
      task: aTask({ phase: TaskPhase.Deploying, instanceId: 'instance-1', runLimit: 1 }),
      releases: [origin, candidate],
      runs: [aRun({ candidateSha: 'pushed-sha-1' })],
    })
    expect(decide(snapshot, observing({ releaseStatus: ReleaseStatus.Failed }), NOW)).toEqual([
      { kind: DecisionKind.CloseRun, runId: 'T1-run1', outcome: RunOutcome.Failed, verifiedSha: null },
      transition(TaskPhase.Implementing),
      transition(TaskPhase.HandOver, TaskResolution.FixUnverified),
    ])
  })

  it('records the verified sha, opens a draft pull request and hands over when the fix is verified', () => {
    const snapshot = aSnapshot({
      task: aTask({ phase: TaskPhase.Verifying, instanceId: 'instance-1' }),
      releases: [origin, candidate],
      runs: [aRun({ candidateSha: 'pushed-sha-1' })],
      executions: [anExecution({ idempotencyKey: 'T1:run1:verify', runId: 'T1-run1' })],
    })
    const events = [item('item-5', checkReported(CheckKind.FixVerified, CheckOutcome.Passed)), item('item-6', turnCompleted())]
    expect(decide(snapshot, observing({ events }), NOW).slice(1, 4)).toEqual([
      { kind: DecisionKind.CloseRun, runId: 'T1-run1', outcome: RunOutcome.Passed, verifiedSha: 'pushed-sha-1' },
      { kind: DecisionKind.OpenPullRequest, runId: 'T1-run1' },
      transition(TaskPhase.HandOver, TaskResolution.FixVerified),
    ])
  })

  it('hands over with fix_unverified when verification fails on the last run', () => {
    const snapshot = aSnapshot({
      task: aTask({ phase: TaskPhase.Verifying, instanceId: 'instance-1', runLimit: 1 }),
      releases: [origin, candidate],
      runs: [aRun({ candidateSha: 'pushed-sha-1' })],
      executions: [anExecution({ idempotencyKey: 'T1:run1:verify', runId: 'T1-run1' })],
    })
    const events = [item('item-5', checkReported(CheckKind.FixVerified, CheckOutcome.Failed)), item('item-6', turnCompleted())]
    const transitions = decide(snapshot, observing({ events }), NOW).filter((decision) => decision.kind === DecisionKind.Transition)
    expect(transitions).toEqual([transition(TaskPhase.HandOver, TaskResolution.FixUnverified)])
  })

  it('retries the same key without consuming a run after a transient failure', () => {
    const snapshot = aSnapshot({
      task: aTask({ phase: TaskPhase.Implementing, instanceId: 'instance-1' }),
      runs: [aRun()],
      executions: [anExecution({ idempotencyKey: 'T1:run1', runId: 'T1-run1', costCents: 10 })],
    })
    const events = [item('item-4', turnFailed(AgentErrorCategory.Transient, 30))]
    expect(decide(snapshot, observing({ events }), NOW)).toEqual([
      { kind: DecisionKind.RetrySameKey, executionId: 'E1', purpose: RunPurpose.Implement, instanceUrl: null, costCents: 40 },
    ])
  })

  it('fails the task instead of retrying the same key when a turn fails for a reason that is not transient', () => {
    const snapshot = aSnapshot({
      task: aTask({ phase: TaskPhase.Implementing, instanceId: 'instance-1' }),
      runs: [aRun()],
      executions: [anExecution({ idempotencyKey: 'T1:run1', runId: 'T1-run1' })],
    })
    const events = [item('item-4', turnFailed(AgentErrorCategory.Permanent))]
    expect(decide(snapshot, observing({ events }), NOW)).toEqual([
      transition(TaskPhase.Failed),
      {
        kind: DecisionKind.RecordExecution,
        executionId: 'E1',
        patch: { eventCursor: 'item-4', status: ExecutionStatus.Failed, costCents: 0, endedAt: NOW },
      },
    ])
  })

  it('moves the event cursor to the last item after acting on it', () => {
    const snapshot = aSnapshot({
      task: aTask({ phase: TaskPhase.Implementing, instanceId: 'instance-1' }),
      runs: [aRun()],
      executions: [anExecution({ idempotencyKey: 'T1:run1', runId: 'T1-run1', costCents: 10 })],
    })
    const decisions = decide(snapshot, observing({ events: [item('item-4', turnCompleted(30))] }), NOW)
    expect(decisions.at(-1)).toEqual({
      kind: DecisionKind.RecordExecution,
      executionId: 'E1',
      patch: { eventCursor: 'item-4', status: ExecutionStatus.Succeeded, costCents: 40, endedAt: NOW },
    })
  })

  it('cancels the run, destroys the sandbox and tears down the instance of a cancelled task', () => {
    const snapshot = aSnapshot({
      task: aTask({ phase: TaskPhase.Cancelled, instanceId: 'instance-1' }),
      sandboxes: [aSandbox()],
      executions: [anExecution()],
    })
    expect(decide(snapshot, observing(), NOW)).toEqual([
      { kind: DecisionKind.CancelRun, sessionId: 'session-1' },
      { kind: DecisionKind.DestroySandbox, sandboxId: 'S1' },
      { kind: DecisionKind.TeardownInstance, instanceId: 'instance-1' },
      { kind: DecisionKind.Complete },
    ])
  })
})
