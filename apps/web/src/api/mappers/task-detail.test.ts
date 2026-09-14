import {
  ArtifactKind,
  CheckKind,
  CheckOutcome,
  CoarseStatus,
  InstanceStatus,
  MessageRole,
  PrState,
  ReportSource,
  RunOutcome,
  TaskEventKind,
  TaskPhase,
  TaskResolution,
} from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import {
  TEST_LOG_URL,
  makeArtifact,
  makeTaskCheck,
  makeTaskDetail,
  makeTaskEvent,
  makeTaskMessage,
  makeTaskRun,
} from '../../../.storybook/fixtures'
import { toArtifact, toCheck, toMessage, toRun, toTaskDetail, toTimelineEntry } from './task-detail'

const diversion = (from: TaskPhase, to: TaskPhase) => makeTaskEvent({ payload: { from, to } })

describe('the task detail mapper', () => {
  it('reads the phase a waiting task diverted from off its latest phase change into needs_input', () => {
    const detail = makeTaskDetail({ phase: TaskPhase.NeedsInput, coarse_status: CoarseStatus.NeedsYou })

    const view = toTaskDetail(detail, [diversion(TaskPhase.Preparing, TaskPhase.NeedsInput), diversion(TaskPhase.Implementing, TaskPhase.NeedsInput)])

    expect(view.divertedFrom).toBe(TaskPhase.Implementing)
  })

  it('names the in-flight check of every working phase that waits on one', () => {
    const pending = [TaskPhase.Intake, TaskPhase.Preparing, TaskPhase.Reproducing, TaskPhase.Implementing, TaskPhase.Verifying].map(
      (phase) => toTaskDetail(makeTaskDetail({ phase }), []).pendingCheck,
    )

    expect(pending).toEqual([null, 'Instance ready', 'Reproduced', null, 'Fix verified'])
  })

  it('gives every resolution a label and one sentence for the reviewer', () => {
    const resolutions = Object.values(TaskResolution).map((resolution) =>
      toTaskDetail(makeTaskDetail({ phase: TaskPhase.HandOver, coarse_status: CoarseStatus.ReadyForReview, resolution }), []).resolution,
    )

    expect(resolutions.every((resolution) => resolution !== null && resolution.label.length > 0 && resolution.sentence.endsWith('.'))).toBe(true)
  })

  it('warns that a fix unverified is unproven', () => {
    const view = toTaskDetail(makeTaskDetail({ phase: TaskPhase.HandOver, resolution: TaskResolution.FixUnverified }), [])

    expect(view.resolution?.sentence).toMatch(/unproven/)
  })

  it('labels a cancelled task from its phase alone, with no resolution', () => {
    const view = toTaskDetail(makeTaskDetail({ phase: TaskPhase.Cancelled, coarse_status: CoarseStatus.Cancelled, resolution: null }), [])

    expect(view.resolution?.label).toBe('Cancelled')
  })

  it('titles a task with no report as a change request and says its instance has not started', () => {
    const view = toTaskDetail(makeTaskDetail({ report: null }), [])

    expect([view.title, view.report, view.instance]).toEqual(['Change request', null, null])
  })

  it('names the instance a task points at for the rail', () => {
    const view = toTaskDetail(
      makeTaskDetail({ instance: { id: '7c3e1b2a-4d5e-4f60-8a71-b2c3d4e5f601', url: null, status: InstanceStatus.Ready, expires_at: null } }),
      [],
    )

    expect(view.instance).toEqual({ id: '7c3e1b2a-4d5e-4f60-8a71-b2c3d4e5f601', identifier: 'task 7c3e', status: InstanceStatus.Ready })
  })

  it('labels every report source', () => {
    const labels = Object.values(ReportSource).map(
      (source) => toTaskDetail(makeTaskDetail({ report: { description: 'x', expected_behaviour: null, reporter: null, source, screenshots: [] } }), []).report?.sourceLabel,
    )

    expect(new Set(labels).size).toBe(Object.values(ReportSource).length)
  })

  it('draws a closed draft pull request with its refs and a link to the provider', () => {
    const view = toTaskDetail(
      makeTaskDetail({
        pull_requests: [{ number: 12, repository_full_name: 'acme/shop', state: PrState.Closed, is_draft: true, head_ref: 'stackbox/task-1', base_ref: 'main' }],
      }),
      [],
    )

    expect(view.pullRequests).toEqual([
      {
        key: 'acme/shop#12',
        label: 'acme/shop #12',
        refs: 'stackbox/task-1 into main',
        stateLabel: 'Draft, closed',
        state: PrState.Closed,
        isDraft: true,
        href: 'https://github.com/acme/shop/pull/12',
      },
    ])
  })

  it('says a check outcome as the assertion', () => {
    expect(toCheck(makeTaskCheck({ kind: CheckKind.ReportReproduced, outcome: CheckOutcome.Passed })).line).toBe('Reproduced: passed')
  })

  it('reads the lines of a test log artifact out of its data URL', () => {
    expect(toArtifact(makeArtifact({ kind: ArtifactKind.TestLog, url: TEST_LOG_URL })).logLines).toEqual([
      'FAIL checkout.spec.ts',
      '  expected the payment step, found the cart',
    ])
  })

  it('prices a run in dollars and names its failed check', () => {
    const run = toRun(
      makeTaskRun({ outcome: RunOutcome.Failed, cost_cents: 60, failed_check: makeTaskCheck({ kind: CheckKind.FixVerified, outcome: CheckOutcome.Failed }) }),
    )

    expect([run.costLabel, run.outcomeLabel, run.failedCheck?.line]).toEqual(['$0.60', 'Failed', 'Fix verified: failed'])
  })

  it('marks an unanswered blocking message as waiting and names the reporter as you', () => {
    const waiting = toMessage(makeTaskMessage({ blocking: true, answered_at: null }))
    const reply = toMessage(makeTaskMessage({ role: MessageRole.User }))

    expect([waiting.waiting, reply.author]).toEqual([true, 'You'])
  })

  it('titles every event kind and marks the ones that did not land', () => {
    const entries = [
      makeTaskEvent({ kind: TaskEventKind.PhaseChanged, payload: { from: TaskPhase.Intake, to: TaskPhase.Preparing } }),
      makeTaskEvent({ kind: TaskEventKind.RunEnded, payload: { number: 1, outcome: RunOutcome.Failed } }),
      makeTaskEvent({ kind: TaskEventKind.CheckRecorded, payload: { checkKind: CheckKind.InstanceReady, outcome: CheckOutcome.Passed } }),
      makeTaskEvent({ kind: TaskEventKind.BudgetExceeded, payload: {} }),
      makeTaskEvent({ kind: TaskEventKind.MessageSent, payload: {} }),
      makeTaskEvent({ kind: TaskEventKind.MessageSendFailed, payload: {} }),
    ].map(toTimelineEntry)

    expect(entries.map((entry) => [entry.title, entry.failed])).toEqual([
      ['Moved to Preparing', false],
      ['Run 1 failed', true],
      ['Instance ready: passed', false],
      ['Stopped: the budget is spent', true],
      ['Sent your reply to the agent', false],
      ['Could not send your reply to the agent', true],
    ])
  })
})
