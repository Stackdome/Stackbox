import type { components } from '@stackbox/contract'
import { CoarseStatus, PrState, ReportSource, TaskKind, TaskPhase, TaskResolution, UserRole } from '@stackbox/contract'

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
    report: { description: 'Checkout button does nothing on Safari', source: ReportSource.Web },
    phase: TaskPhase.NeedsInput,
    coarse_status: CoarseStatus.NeedsYou,
    blocking_question: 'Which Safari version shows the dead button?',
    created_at: hoursAgo(2),
  }),
  makeTaskSummary({
    id: 'task-2',
    application: BILLING,
    report: { description: 'Invoice PDF shows the wrong currency symbol', source: ReportSource.Web },
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
    report: { description: 'Discount code is ignored in the cart total', source: ReportSource.Web },
    phase: TaskPhase.Deploying,
    run_number: 2,
    pull_request: { number: 58, repository_short_name: 'billing', state: PrState.Open, is_draft: true },
    created_at: hoursAgo(5),
  }),
  makeTaskSummary({
    id: 'task-5',
    report: { description: 'Password reset link expires immediately', source: ReportSource.Web },
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
    resolution: TaskResolution.Abandoned,
    created_at: hoursAgo(120),
    completed_at: hoursAgo(119),
  }),
]
