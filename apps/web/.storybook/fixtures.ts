import type { components } from '@stackbox/contract'
import {
  ArtifactKind,
  CheckKind,
  CheckOutcome,
  CoarseStatus,
  MessageRole,
  PrState,
  ReportSource,
  RunOutcome,
  TaskEventKind,
  TaskKind,
  TaskPhase,
  TaskResolution,
  UserRole,
} from '@stackbox/contract'

type Schemas = components['schemas']
export type User = Schemas['User']
export type Organization = Schemas['Organisation']

export const ORG_ID = 'org-1'

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    name: 'Ada Lovelace',
    username: 'ada',
    email: 'ada@example.com',
    organisation: 'acme',
    organisation_id: ORG_ID,
    role: UserRole.OrgAdmin,
    ...overrides,
  }
}

export function makeOrganization(overrides: Partial<Organization> = {}): Organization {
  return {
    id: ORG_ID,
    name: 'acme',
    is_platform: false,
    created_at: '2026-07-20T09:00:00Z',
    updated_at: '2026-07-20T09:00:00Z',
    ...overrides,
  }
}

export type TaskSummary = Schemas['TaskSummary']
export type ApplicationSummary = Schemas['ApplicationSummary']

export const APPLICATIONS: ApplicationSummary[] = [
  { id: 'app-billing', name: 'billing' },
  { id: 'app-shop', name: 'shop' },
]

const [BILLING, SHOP] = APPLICATIONS
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString()

export function makeTaskSummary(overrides: Partial<TaskSummary> = {}): TaskSummary {
  return {
    id: 'task-3',
    application: SHOP,
    report: { description: 'Search returns nothing for accented names', source: ReportSource.Web },
    kind: TaskKind.Fix,
    phase: TaskPhase.Reproducing,
    coarse_status: CoarseStatus.Running,
    resolution: null,
    run_number: 1,
    run_limit: 2,
    blocking_question: null,
    pull_request: null,
    instance: null,
    cost_cents: 0,
    created_at: hoursAgo(1),
    completed_at: null,
    ...overrides,
  }
}

/** Prompt 02 state 1, in the order the server answers: Needs you first, then newest. */
export const TASK_SUMMARIES: TaskSummary[] = [
  makeTaskSummary({
    id: 'task-1',
    report: { description: 'Checkout button does nothing on Safari', source: ReportSource.Slack },
    phase: TaskPhase.NeedsInput,
    coarse_status: CoarseStatus.NeedsYou,
    blocking_question: 'Which Safari version shows the dead button?',
    created_at: hoursAgo(2),
  }),
  makeTaskSummary({
    id: 'task-2',
    application: BILLING,
    report: { description: 'Invoice PDF shows the wrong currency symbol', source: ReportSource.Sentry },
    phase: TaskPhase.NeedsInput,
    coarse_status: CoarseStatus.NeedsYou,
    run_number: 2,
    blocking_question: "Should the symbol follow the customer's locale or the store's?",
    pull_request: { number: 57, repository_short_name: 'billing', state: PrState.Open, is_draft: true },
    created_at: hoursAgo(30),
  }),
  makeTaskSummary(),
  makeTaskSummary({
    id: 'task-4',
    application: BILLING,
    report: { description: 'Discount code is ignored in the cart total', source: ReportSource.Jam },
    phase: TaskPhase.Deploying,
    run_number: 2,
    pull_request: { number: 58, repository_short_name: 'billing', state: PrState.Open, is_draft: true },
    created_at: hoursAgo(5),
  }),
  makeTaskSummary({
    id: 'task-5',
    report: { description: 'Password reset link expires immediately', source: ReportSource.Harness },
    phase: TaskPhase.HandOver,
    coarse_status: CoarseStatus.ReadyForReview,
    resolution: TaskResolution.FixVerified,
    pull_request: { number: 142, repository_short_name: 'shop', state: PrState.Merged, is_draft: false },
    created_at: hoursAgo(48),
    completed_at: hoursAgo(40),
  }),
  makeTaskSummary({
    id: 'task-6',
    report: { description: 'Profile photo upload times out', source: ReportSource.Web },
    phase: TaskPhase.HandOver,
    coarse_status: CoarseStatus.ReadyForReview,
    resolution: TaskResolution.NotReproduced,
    created_at: hoursAgo(72),
    completed_at: hoursAgo(70),
  }),
  makeTaskSummary({
    id: 'task-7',
    application: BILLING,
    report: { description: 'Order export drops the last row', source: ReportSource.Web },
    phase: TaskPhase.Failed,
    coarse_status: CoarseStatus.Failed,
    run_number: 2,
    created_at: hoursAgo(96),
    completed_at: hoursAgo(90),
  }),
  makeTaskSummary({
    id: 'task-8',
    report: { description: 'Dark mode resets after a reload', source: ReportSource.Web },
    phase: TaskPhase.Cancelled,
    coarse_status: CoarseStatus.Cancelled,
    resolution: null,
    created_at: hoursAgo(120),
    completed_at: hoursAgo(119),
  }),
]

export type TaskDetail = Schemas['TaskDetail']
export type TaskEvent = Schemas['TaskEvent']
export type TaskCheck = Schemas['TaskCheck']
export type TaskRun = Schemas['TaskRun']
export type TaskMessage = Schemas['TaskMessage']
export type Artifact = Schemas['Artifact']

export type TaskDetailFixture = {
  detail: TaskDetail
  events: TaskEvent[]
  checks: TaskCheck[]
  runs: TaskRun[]
  messages: TaskMessage[]
  artifacts: Artifact[]
}

export const SCREENSHOT_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
export const TEST_LOG_URL = `data:text/plain;base64,${btoa('FAIL checkout.spec.ts\n  expected the payment step, found the cart\n')}`

const minutesAfter = (iso: string, minutes: number) => new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()

export function makeArtifact(overrides: Partial<Artifact> = {}): Artifact {
  return { id: 'artifact-1', kind: ArtifactKind.Screenshot, url: SCREENSHOT_URL, meta: { name: 'screenshot.png' }, ...overrides }
}

export function makeTaskEvent(overrides: Partial<TaskEvent> = {}): TaskEvent {
  return { id: 'event-1', kind: TaskEventKind.PhaseChanged, payload: {}, at: hoursAgo(1), ...overrides }
}

export function makeTaskCheck(overrides: Partial<TaskCheck> = {}): TaskCheck {
  return {
    id: 'check-1',
    kind: CheckKind.InstanceReady,
    outcome: CheckOutcome.Passed,
    run_number: null,
    commit_sha: 'a1b2c3d4e5f6',
    ran_at: hoursAgo(1),
    artifacts: [],
    ...overrides,
  }
}

export function makeTaskRun(overrides: Partial<TaskRun> = {}): TaskRun {
  return {
    id: 'run-1',
    number: 1,
    outcome: RunOutcome.Running,
    candidate_sha: null,
    verified_sha: null,
    started_at: hoursAgo(1),
    ended_at: null,
    cost_cents: 0,
    failed_check: null,
    ...overrides,
  }
}

export function makeTaskMessage(overrides: Partial<TaskMessage> = {}): TaskMessage {
  return {
    id: 'message-1',
    role: MessageRole.Agent,
    body: 'I reproduced the dead button on Safari 17 with a clean profile.',
    blocking: false,
    answered_at: null,
    replies_to_id: null,
    created_at: hoursAgo(1),
    ...overrides,
  }
}

export function makeTaskDetail(overrides: Partial<TaskDetail> = {}): TaskDetail {
  const { report, target_branch, budget_cents, pull_requests, ...summaryOverrides } = overrides
  const summary = makeTaskSummary(summaryOverrides)
  return {
    ...summary,
    report:
      report === undefined
        ? summary.report && { ...summary.report, expected_behaviour: 'Searching for José finds José.', reporter: 'Ada Lovelace', screenshots: [] }
        : report,
    target_branch: target_branch === undefined ? 'main' : target_branch,
    budget_cents: budget_cents === undefined ? null : budget_cents,
    pull_requests: pull_requests ?? [],
  }
}

export function phaseEvents(taskId: string, path: TaskPhase[], start: string): TaskEvent[] {
  return path.slice(1).map((to, index) =>
    makeTaskEvent({ id: `${taskId}-phase-${index + 1}`, payload: { from: path[index], to }, at: minutesAfter(start, (index + 1) * 10) }),
  )
}

const P = TaskPhase
const TO_IMPLEMENTING = [P.Intake, P.Preparing, P.Reproducing, P.Implementing]
const DEPLOY_AND_VERIFY = [P.Deploying, P.Verifying]

function summaryOf(id: string): TaskSummary {
  return TASK_SUMMARIES.filter((row) => row.id === id)[0]
}

function fixtureFor(id: string, path: TaskPhase[], parts: Partial<Omit<TaskDetailFixture, 'detail' | 'events'>> & { detail?: Partial<TaskDetail> } = {}): TaskDetailFixture {
  const { report, ...summary } = summaryOf(id)
  const checks = parts.checks ?? []
  const screenshots = parts.detail?.report?.screenshots ?? []
  // A failed run names its latest failed check, so the Runs tab and the Checks tab agree.
  const runs = (parts.runs ?? []).map((run) => ({
    ...run,
    failed_check: checks.filter((check) => check.run_number === run.number && check.outcome === CheckOutcome.Failed).at(-1) ?? null,
  }))
  return {
    detail: makeTaskDetail({
      ...summary,
      report: report && { ...report, expected_behaviour: null, reporter: 'Ada Lovelace', screenshots: [] },
      ...parts.detail,
    }),
    events: phaseEvents(id, path, summary.created_at),
    checks,
    runs,
    messages: parts.messages ?? [],
    artifacts: [...screenshots, ...checks.flatMap((check) => check.artifacts)],
  }
}

const ready = (id: string) => makeTaskCheck({ id: `${id}-ready` })
const reproduced = (id: string, outcome = CheckOutcome.Passed) => makeTaskCheck({ id: `${id}-reproduced`, kind: CheckKind.ReportReproduced, outcome })
const verification = (id: string, run: number, outcome: CheckOutcome) =>
  makeTaskCheck({
    id: `${id}-verified-${run}`,
    kind: CheckKind.FixVerified,
    outcome,
    run_number: run,
    artifacts:
      outcome === CheckOutcome.Failed
        ? [makeArtifact({ id: `${id}-log-${run}`, kind: ArtifactKind.TestLog, url: TEST_LOG_URL, meta: { name: 'verify.log' } })]
        : [makeArtifact({ id: `${id}-shot-${run}`, meta: { name: 'fixed.png' } })],
  })

export const TASK_DETAILS: TaskDetailFixture[] = [
  fixtureFor('task-1', [...TO_IMPLEMENTING, P.NeedsInput], {
    detail: {
      report: {
        description: 'Checkout button does nothing on Safari',
        expected_behaviour: 'Tapping Checkout opens the payment step.',
        reporter: 'Mara Singh',
        source: ReportSource.Slack,
        screenshots: [makeArtifact({ id: 'task-1-report-shot', meta: { name: 'safari-checkout.png' } })],
      },
    },
    checks: [ready('task-1'), reproduced('task-1')],
    runs: [makeTaskRun({ id: 'task-1-run-1', cost_cents: 40 })],
    messages: [
      makeTaskMessage({ id: 'task-1-note' }),
      makeTaskMessage({ id: 'task-1-question', body: 'Which Safari version shows the dead button?', blocking: true }),
    ],
  }),
  fixtureFor('task-2', [...TO_IMPLEMENTING, ...DEPLOY_AND_VERIFY, P.Implementing, ...DEPLOY_AND_VERIFY, P.NeedsInput], {
    detail: {
      pull_requests: [{ number: 57, repository_full_name: 'acme/billing', state: PrState.Open, is_draft: true, head_ref: 'stackbox/task-2', base_ref: 'main' }],
    },
    checks: [ready('task-2'), reproduced('task-2'), verification('task-2', 1, CheckOutcome.Failed)],
    runs: [
      makeTaskRun({ id: 'task-2-run-1', outcome: RunOutcome.Failed, candidate_sha: 'b7e1c0d9aa01', cost_cents: 60, ended_at: hoursAgo(29) }),
      makeTaskRun({ id: 'task-2-run-2', number: 2, cost_cents: 40 }),
    ],
    messages: [makeTaskMessage({ id: 'task-2-question', body: "Should the symbol follow the customer's locale or the store's?", blocking: true })],
  }),
  fixtureFor('task-3', [P.Intake, P.Preparing, P.Reproducing], { checks: [ready('task-3')] }),
  fixtureFor('task-4', [...TO_IMPLEMENTING, ...DEPLOY_AND_VERIFY, P.Implementing, P.Deploying], {
    detail: {
      pull_requests: [{ number: 58, repository_full_name: 'acme/billing', state: PrState.Open, is_draft: true, head_ref: 'stackbox/task-4', base_ref: 'main' }],
    },
    checks: [ready('task-4'), reproduced('task-4'), verification('task-4', 1, CheckOutcome.Failed)],
    runs: [
      makeTaskRun({ id: 'task-4-run-1', outcome: RunOutcome.Failed, candidate_sha: 'c0ffee12ab34', cost_cents: 55, ended_at: hoursAgo(4) }),
      makeTaskRun({ id: 'task-4-run-2', number: 2, candidate_sha: 'd00dfeed5678', cost_cents: 35 }),
    ],
  }),
  fixtureFor('task-5', [...TO_IMPLEMENTING, ...DEPLOY_AND_VERIFY, P.HandOver], {
    detail: {
      pull_requests: [{ number: 142, repository_full_name: 'acme/shop', state: PrState.Merged, is_draft: false, head_ref: 'stackbox/task-5', base_ref: 'main' }],
    },
    checks: [ready('task-5'), reproduced('task-5'), verification('task-5', 1, CheckOutcome.Passed)],
    runs: [makeTaskRun({ id: 'task-5-run-1', outcome: RunOutcome.Passed, candidate_sha: 'e5f6a7b8c9d0', verified_sha: 'e5f6a7b8c9d0', cost_cents: 80, ended_at: hoursAgo(40) })],
    messages: [makeTaskMessage({ id: 'task-5-note', body: 'Opened pull request #142 with the verified fix.' })],
  }),
  fixtureFor('task-6', [P.Intake, P.Preparing, P.Reproducing, P.HandOver], { checks: [ready('task-6'), reproduced('task-6', CheckOutcome.Failed)] }),
  fixtureFor('task-7', [...TO_IMPLEMENTING, ...DEPLOY_AND_VERIFY, P.Implementing, ...DEPLOY_AND_VERIFY, P.Failed], {
    checks: [ready('task-7'), reproduced('task-7'), verification('task-7', 1, CheckOutcome.Failed), verification('task-7', 2, CheckOutcome.Failed)],
    runs: [
      makeTaskRun({ id: 'task-7-run-1', outcome: RunOutcome.Failed, candidate_sha: 'f1e2d3c4b5a6', cost_cents: 60, ended_at: hoursAgo(93) }),
      makeTaskRun({ id: 'task-7-run-2', number: 2, outcome: RunOutcome.Failed, candidate_sha: 'a6b5c4d3e2f1', cost_cents: 70, ended_at: hoursAgo(90) }),
    ],
  }),
  fixtureFor('task-8', [...TO_IMPLEMENTING, P.Cancelled], {
    checks: [ready('task-8'), reproduced('task-8')],
    runs: [makeTaskRun({ id: 'task-8-run-1', outcome: RunOutcome.Abandoned, cost_cents: 20, ended_at: hoursAgo(119) })],
  }),
]
