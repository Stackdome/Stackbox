import {
  ApplicationRole,
  ArtifactKind,
  ArtifactOwner,
  CheckKind,
  CheckOutcome,
  ExecutionStatus,
  InstancePurpose,
  InstanceStatus,
  MessageRole,
  PrState,
  ReleaseStatus,
  RepoProvider,
  ReportSource,
  RunOutcome,
  SandboxStatus,
  TaskEventKind,
  TaskKind,
  TaskPhase,
  TaskResolution,
  UserRole,
} from '@stackbox/contract'
import { eq, inArray, or } from 'drizzle-orm'
import { defaultPolicies } from '../access/calc/default-policies'
import { ORG_SCOPE } from '../access/types'
import { EnvironmentType } from '../ports'
import { reproKey, runKey } from '../tasks/calc/idempotency-key'
import type { Database } from './client'
import {
  application,
  applicationInstance,
  artifact,
  execution,
  gitConnection,
  organization,
  policy,
  pullRequest,
  release,
  report,
  repository,
  roleBinding,
  run,
  sandbox,
  task,
  taskCheck,
  taskEvent,
  taskMessage,
  userAccount,
} from './schema'

export const FIXTURE = {
  organizationName: 'acme',
  adminEmail: 'ada@example.com',
  viewerEmail: 'vik@example.com',
  developerEmail: 'dev@example.com',
  password: 'password',
  budgetTaskDescription: 'Nightly invoice run exceeds its budget',
} as const

const APPLICATIONS = ['shop', 'billing'] as const
type ApplicationName = (typeof APPLICATIONS)[number]

type FixtureCheck = { kind: CheckKind; outcome: CheckOutcome; run: number | null }

type FixtureTask = {
  application: ApplicationName
  description: string
  source: ReportSource
  reporter: string
  expectedBehaviour: string | null
  // Phases in the order the task visited them; the last one is its phase now.
  path: TaskPhase[]
  resolution: TaskResolution | null
  runs: number
  createdHoursAgo: number
  completedHoursAgo: number | null
  messages: { body: string; blocking: boolean }[]
  checks: FixtureCheck[]
  screenshot: boolean
  budgetCents: number | null
  spentBeforeRunsCents: number
  pullRequest: { number: number; isDraft: boolean; state: PrState } | null
}

const P = TaskPhase
const TO_IMPLEMENTING = [P.Intake, P.Preparing, P.Reproducing, P.Implementing]
const DEPLOY_AND_VERIFY = [P.Deploying, P.Verifying]
const READY: FixtureCheck = { kind: CheckKind.InstanceReady, outcome: CheckOutcome.Passed, run: null }
const REPRODUCED: FixtureCheck = { kind: CheckKind.ReportReproduced, outcome: CheckOutcome.Passed, run: null }
const verified = (run: number, outcome: CheckOutcome): FixtureCheck => ({ kind: CheckKind.FixVerified, outcome, run })

const TASKS: FixtureTask[] = [
  {
    application: 'shop', description: 'Checkout button does nothing on Safari', source: ReportSource.Slack, reporter: 'Mara Singh',
    expectedBehaviour: 'Tapping Checkout opens the payment step.', path: [...TO_IMPLEMENTING, P.NeedsInput], resolution: null, runs: 1,
    createdHoursAgo: 2, completedHoursAgo: null,
    messages: [
      { body: 'I reproduced the dead button on Safari 17 with a clean profile.', blocking: false },
      { body: 'Which Safari version shows the dead button?', blocking: true },
    ],
    checks: [READY, REPRODUCED], screenshot: true, budgetCents: null, spentBeforeRunsCents: 0, pullRequest: null,
  },
  {
    application: 'billing', description: 'Invoice PDF shows the wrong currency symbol', source: ReportSource.Sentry, reporter: 'sentry',
    expectedBehaviour: null, path: [...TO_IMPLEMENTING, ...DEPLOY_AND_VERIFY, P.Implementing, ...DEPLOY_AND_VERIFY, P.NeedsInput], resolution: null, runs: 2,
    createdHoursAgo: 30, completedHoursAgo: null,
    messages: [{ body: "Should the symbol follow the customer's locale or the store's?", blocking: true }],
    checks: [READY, REPRODUCED, verified(1, CheckOutcome.Failed)], screenshot: false, budgetCents: null, spentBeforeRunsCents: 0,
    pullRequest: { number: 57, isDraft: true, state: PrState.Open },
  },
  {
    application: 'shop', description: 'Search returns nothing for accented names', source: ReportSource.Web, reporter: 'Ada Lovelace',
    expectedBehaviour: 'Searching for José finds José.', path: [P.Intake, P.Preparing, P.Reproducing], resolution: null, runs: 1,
    createdHoursAgo: 1, completedHoursAgo: null, messages: [], checks: [READY], screenshot: false, budgetCents: null, spentBeforeRunsCents: 0,
    pullRequest: null,
  },
  {
    application: 'billing', description: 'Discount code is ignored in the cart total', source: ReportSource.Jam, reporter: 'Lee Park',
    expectedBehaviour: 'The total drops by the discount.', path: [...TO_IMPLEMENTING, ...DEPLOY_AND_VERIFY, P.Implementing, P.Deploying], resolution: null, runs: 2,
    createdHoursAgo: 5, completedHoursAgo: null, messages: [], checks: [READY, REPRODUCED, verified(1, CheckOutcome.Failed)], screenshot: false,
    budgetCents: null, spentBeforeRunsCents: 0, pullRequest: { number: 58, isDraft: true, state: PrState.Open },
  },
  {
    application: 'shop', description: 'Password reset link expires immediately', source: ReportSource.Harness, reporter: 'harness',
    expectedBehaviour: 'The link works for 24 hours.', path: [...TO_IMPLEMENTING, ...DEPLOY_AND_VERIFY, P.HandOver], resolution: TaskResolution.FixVerified, runs: 1,
    createdHoursAgo: 48, completedHoursAgo: 40, messages: [{ body: 'Opened pull request #142 with the verified fix.', blocking: false }],
    checks: [READY, REPRODUCED, verified(1, CheckOutcome.Passed)], screenshot: false, budgetCents: null, spentBeforeRunsCents: 0,
    pullRequest: { number: 142, isDraft: false, state: PrState.Merged },
  },
  {
    application: 'shop', description: 'Profile photo upload times out', source: ReportSource.Web, reporter: 'Vik Rao',
    expectedBehaviour: null, path: [P.Intake, P.Preparing, P.Reproducing, P.HandOver], resolution: TaskResolution.NotReproduced, runs: 1,
    createdHoursAgo: 72, completedHoursAgo: 70, messages: [], checks: [READY, { kind: CheckKind.ReportReproduced, outcome: CheckOutcome.Failed, run: null }],
    screenshot: false, budgetCents: null, spentBeforeRunsCents: 0, pullRequest: null,
  },
  {
    application: 'billing', description: 'Order export drops the last row', source: ReportSource.Slack, reporter: 'Mara Singh',
    expectedBehaviour: 'The export has every order.', path: [...TO_IMPLEMENTING, ...DEPLOY_AND_VERIFY, P.Implementing, ...DEPLOY_AND_VERIFY, P.Failed], resolution: null, runs: 2,
    createdHoursAgo: 96, completedHoursAgo: 90, messages: [],
    checks: [READY, REPRODUCED, verified(1, CheckOutcome.Failed), verified(2, CheckOutcome.Failed)], screenshot: false, budgetCents: null,
    spentBeforeRunsCents: 0, pullRequest: null,
  },
  {
    application: 'shop', description: 'Dark mode resets after a reload', source: ReportSource.Web, reporter: 'Dev Ito',
    expectedBehaviour: 'Dark mode stays on.', path: [...TO_IMPLEMENTING, P.Cancelled], resolution: null, runs: 1,
    createdHoursAgo: 120, completedHoursAgo: 119, messages: [], checks: [READY, REPRODUCED], screenshot: false, budgetCents: null,
    spentBeforeRunsCents: 0, pullRequest: null,
  },
  {
    application: 'billing', description: FIXTURE.budgetTaskDescription, source: ReportSource.Harness, reporter: 'harness',
    expectedBehaviour: null, path: [P.Intake], resolution: null, runs: 0, createdHoursAgo: 200, completedHoursAgo: null, messages: [], checks: [],
    screenshot: false, budgetCents: 1, spentBeforeRunsCents: 5, pullRequest: null,
  },
]

const LAST_RUN_OUTCOME: Partial<Record<TaskPhase, RunOutcome>> = {
  [TaskPhase.HandOver]: RunOutcome.Passed,
  [TaskPhase.Failed]: RunOutcome.Failed,
  [TaskPhase.Cancelled]: RunOutcome.Abandoned,
}

const EXECUTION_STATUS: Record<RunOutcome, ExecutionStatus> = {
  [RunOutcome.Running]: ExecutionStatus.Running,
  [RunOutcome.Passed]: ExecutionStatus.Succeeded,
  [RunOutcome.Failed]: ExecutionStatus.Failed,
  [RunOutcome.Abandoned]: ExecutionStatus.Cancelled,
}

const SEED_LEASE_OWNER = 'seed-fixture'
const SEED_LEASE_MS = 100 * 365 * 24 * 60 * 60 * 1000

const STEP_MINUTES = 10
const RUN_COST_CENTS = 40
const REPRO_COST_CENTS = 20
const SCREENSHOT_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
const TEST_LOG_URL = `data:text/plain;base64,${Buffer.from('FAIL checkout.spec.ts\n  expected the payment step, found the cart\n').toString('base64')}`

type Step = { phase: TaskPhase; at: Date }

function hoursBefore(now: Date, hours: number): Date {
  return new Date(now.getTime() - hours * 60 * 60 * 1000)
}

function minutesAfter(at: Date, minutes: number): Date {
  return new Date(at.getTime() + minutes * 60 * 1000)
}

function entryAt(steps: Step[], phase: TaskPhase, occurrence: number): Date | undefined {
  return steps.filter((step) => step.phase === phase)[occurrence - 1]?.at
}

function exitAt(steps: Step[], phase: TaskPhase, occurrence: number): Date | undefined {
  const entry = steps.filter((step) => step.phase === phase)[occurrence - 1]
  return entry && steps[steps.indexOf(entry) + 1]?.at
}

function checkAt(steps: Step[], check: FixtureCheck): Date {
  const last = steps[steps.length - 1].at
  switch (check.kind) {
    case CheckKind.InstanceReady:
      return entryAt(steps, TaskPhase.Reproducing, 1) ?? last
    case CheckKind.ReportReproduced:
      return exitAt(steps, TaskPhase.Reproducing, 1) ?? last
    case CheckKind.FixVerified:
      return exitAt(steps, TaskPhase.Verifying, check.run ?? 1) ?? last
  }
}

export async function seed(db: Database, options: { passwordHash: string; now: Date }): Promise<void> {
  const { passwordHash, now } = options
  await db.transaction(async (tx) => {
    const previous = await tx.select({ orgId: userAccount.orgId }).from(userAccount).where(eq(userAccount.email, FIXTURE.adminEmail))
    if (previous.length > 0) {
      const orgIds = previous.map((row) => row.orgId)
      // pull_request does not cascade from task or repository, and artifact.owner_id has no foreign key, so both go first.
      const repositories = tx.select({ id: repository.id }).from(repository).where(inArray(repository.orgId, orgIds))
      const applications = tx.select({ id: application.id }).from(application).where(inArray(application.orgId, orgIds))
      const reports = tx.select({ id: report.id }).from(report).where(inArray(report.applicationId, applications))
      const tasks = tx.select({ id: task.id }).from(task).where(inArray(task.applicationId, applications))
      const checks = tx.select({ id: taskCheck.id }).from(taskCheck).where(inArray(taskCheck.taskId, tasks))
      const messages = tx.select({ id: taskMessage.id }).from(taskMessage).where(inArray(taskMessage.taskId, tasks))
      await tx.delete(pullRequest).where(inArray(pullRequest.repositoryId, repositories))
      await tx
        .delete(artifact)
        .where(or(inArray(artifact.ownerId, orgIds), inArray(artifact.ownerId, reports), inArray(artifact.ownerId, checks), inArray(artifact.ownerId, messages)))
      await tx.delete(organization).where(inArray(organization.id, orgIds))
    }

    const [org] = await tx.insert(organization).values({ name: FIXTURE.organizationName, budgetCents: 50_000 }).returning({ id: organization.id })
    const [ada, vik, dev] = await tx
      .insert(userAccount)
      .values([
        { orgId: org.id, email: FIXTURE.adminEmail, name: 'Ada Lovelace', passwordHash, orgRole: UserRole.OrgAdmin },
        { orgId: org.id, email: FIXTURE.viewerEmail, name: 'Vik Rao', passwordHash, orgRole: UserRole.OrgMember },
        { orgId: org.id, email: FIXTURE.developerEmail, name: 'Dev Ito', passwordHash, orgRole: UserRole.OrgMember },
      ])
      .returning({ id: userAccount.id })
    await tx.insert(gitConnection).values({ orgId: org.id, provider: RepoProvider.Github, installationRef: 'acme-installation', accountLogin: 'acme' })

    const repositoryIds = new Map<ApplicationName, string>()
    const applicationIds = new Map<ApplicationName, string>()
    for (const name of APPLICATIONS) {
      const [repo] = await tx
        .insert(repository)
        .values({ orgId: org.id, provider: RepoProvider.Github, externalId: `acme-${name}`, fullName: `acme/${name}` })
        .returning({ id: repository.id })
      const [app] = await tx.insert(application).values({ orgId: org.id, name, slug: name, repositoryId: repo.id }).returning({ id: application.id })
      repositoryIds.set(name, repo.id)
      applicationIds.set(name, app.id)
    }

    await tx.insert(policy).values(defaultPolicies(org.id))
    await tx.insert(roleBinding).values([
      { orgId: org.id, userId: ada.id, subject: UserRole.OrgAdmin, scope: ORG_SCOPE },
      { orgId: org.id, userId: vik.id, subject: UserRole.OrgMember, scope: ORG_SCOPE },
      { orgId: org.id, userId: vik.id, subject: ApplicationRole.Viewer, scope: applicationIds.get('shop') as string },
      { orgId: org.id, userId: dev.id, subject: UserRole.OrgMember, scope: ORG_SCOPE },
      { orgId: org.id, userId: dev.id, subject: ApplicationRole.Developer, scope: applicationIds.get('shop') as string },
    ])

    for (const fixture of TASKS) {
      const applicationId = applicationIds.get(fixture.application) as string
      const createdAt = hoursBefore(now, fixture.createdHoursAgo)
      const steps: Step[] = fixture.path.map((phase, index) => ({ phase, at: minutesAfter(createdAt, index * STEP_MINUTES) }))
      const phase = fixture.path[fixture.path.length - 1]
      const lastAt = steps[steps.length - 1].at
      // A running last run has no candidateSha and no execution the scripted AgentRuntime port ever started.
      const hasUnissuedRun = fixture.runs > 0 && (LAST_RUN_OUTCOME[phase] ?? RunOutcome.Running) === RunOutcome.Running

      const [written] = await tx
        .insert(report)
        .values({ applicationId, source: fixture.source, description: fixture.description, expectedBehaviour: fixture.expectedBehaviour, reporter: fixture.reporter, createdAt })
        .returning({ id: report.id })
      const [created] = await tx
        .insert(task)
        .values({
          applicationId,
          reportId: written.id,
          kind: TaskKind.Fix,
          targetBranch: 'main',
          phase,
          resolution: fixture.resolution,
          runLimit: 2,
          budgetCents: fixture.budgetCents,
          createdAt,
          completedAt: fixture.completedHoursAgo === null ? null : hoursBefore(now, fixture.completedHoursAgo),
          // The reconciler must never act on fabricated external references; the lease keeps it away.
          leaseOwner: hasUnissuedRun ? SEED_LEASE_OWNER : null,
          leaseExpiresAt: hasUnissuedRun ? new Date(now.getTime() + SEED_LEASE_MS) : null,
        })
        .returning({ id: task.id })
      const taskId = created.id

      if (fixture.screenshot) {
        await tx.insert(artifact).values({ ownerType: ArtifactOwner.Report, ownerId: written.id, kind: ArtifactKind.Screenshot, url: SCREENSHOT_URL, meta: { name: 'safari-checkout.png' }, createdAt })
      }

      const events: (typeof taskEvent.$inferInsert)[] = steps.slice(1).map((step, index) => ({
        taskId,
        kind: TaskEventKind.PhaseChanged,
        payload: { from: steps[index].phase, to: step.phase, ...(index === steps.length - 2 && fixture.resolution !== null ? { resolution: fixture.resolution } : {}) },
        at: step.at,
      }))

      const runRows =
        fixture.runs === 0
          ? []
          : await tx
            .insert(run)
            .values(
              Array.from({ length: fixture.runs }, (_, index) => {
                const number = index + 1
                const outcome = number < fixture.runs ? RunOutcome.Failed : (LAST_RUN_OUTCOME[phase] ?? RunOutcome.Running)
                return {
                  taskId,
                  number,
                  outcome,
                  // A running seeded run has pushed nothing; the task-level lease above keeps the reconciler off it.
                  candidateSha: outcome === RunOutcome.Running ? null : `seed-${number}`,
                  startedAt: entryAt(steps, TaskPhase.Implementing, number) ?? createdAt,
                  endedAt: outcome === RunOutcome.Running ? null : (exitAt(steps, TaskPhase.Verifying, number) ?? lastAt),
                }
              }),
            )
            .returning()
      for (const row of runRows) {
        events.push({ taskId, kind: TaskEventKind.RunStarted, payload: { number: row.number }, at: row.startedAt })
        if (row.endedAt) events.push({ taskId, kind: TaskEventKind.RunEnded, payload: { number: row.number, outcome: row.outcome }, at: row.endedAt })
      }

      const reproduced = fixture.checks.some((check) => check.kind === CheckKind.ReportReproduced)
      if (runRows.length > 0 || reproduced || fixture.spentBeforeRunsCents > 0) {
        const [box] = await tx
          .insert(sandbox)
          .values({ taskId, provider: EnvironmentType.OpenAiHosted, status: SandboxStatus.Stopped, createdAt, stoppedAt: lastAt })
          .returning({ id: sandbox.id })
        await tx.insert(execution).values([
          ...(reproduced || fixture.spentBeforeRunsCents > 0
            ? [{
              sandboxId: box.id,
              taskId,
              idempotencyKey: reproKey(taskId),
              status: fixture.spentBeforeRunsCents > 0 ? ExecutionStatus.Failed : ExecutionStatus.Succeeded,
              costCents: fixture.spentBeforeRunsCents > 0 ? fixture.spentBeforeRunsCents : REPRO_COST_CENTS,
              startedAt: createdAt,
              endedAt: lastAt,
            }]
            : []),
          ...runRows.map((row) => ({
            sandboxId: box.id,
            taskId,
            runId: row.id,
            idempotencyKey: runKey(taskId, row.number),
            status: EXECUTION_STATUS[row.outcome],
            costCents: RUN_COST_CENTS,
            startedAt: row.startedAt,
            endedAt: row.endedAt,
          })),
        ])
      }

      const needsRelease = fixture.checks.some((check) => check.kind === CheckKind.FixVerified)
      const [origin] = needsRelease
        ? await tx
          .insert(applicationInstance)
          .values({ applicationId, purpose: InstancePurpose.Task, taskId, url: `https://${fixture.application}-${taskId.slice(0, 8)}.instances.test`, status: InstanceStatus.TornDown, createdAt })
          .returning({ id: applicationInstance.id })
        : []
      const [live] = origin
        ? await tx.insert(release).values({ instanceId: origin.id, commitSha: 'seed-origin', status: ReleaseStatus.Live, createdAt }).returning({ id: release.id })
        : []

      for (const check of fixture.checks) {
        const runRow = check.run === null ? undefined : runRows.find((row) => row.number === check.run)
        const [stored] = await tx
          .insert(taskCheck)
          .values({
            taskId,
            runId: runRow?.id ?? null,
            releaseId: check.kind === CheckKind.FixVerified ? (live?.id ?? null) : null,
            kind: check.kind,
            outcome: check.outcome,
            commitSha: runRow?.candidateSha ?? null,
            ranAt: checkAt(steps, check),
          })
          .returning()
        events.push({ taskId, kind: TaskEventKind.CheckRecorded, payload: { checkId: stored.id, checkKind: check.kind, outcome: check.outcome, runId: stored.runId }, at: stored.ranAt })
        if (check.kind === CheckKind.FixVerified && check.outcome === CheckOutcome.Failed) {
          await tx.insert(artifact).values({ ownerType: ArtifactOwner.TaskCheck, ownerId: stored.id, kind: ArtifactKind.TestLog, url: TEST_LOG_URL, meta: { name: 'verify.log' }, createdAt: stored.ranAt })
        }
      }

      if (events.length > 0) {
        await tx.insert(taskEvent).values(events)
      }

      if (fixture.messages.length > 0) {
        await tx.insert(taskMessage).values(
          fixture.messages.map((message, index) => ({
            taskId,
            role: MessageRole.Agent,
            body: message.body,
            blocking: message.blocking,
            createdAt: minutesAfter(lastAt, index - fixture.messages.length),
          })),
        )
      }

      if (fixture.pullRequest) {
        await tx.insert(pullRequest).values({
          taskId,
          repositoryId: repositoryIds.get(fixture.application) as string,
          headRef: `stackbox/${taskId}`,
          baseRef: 'main',
          ...fixture.pullRequest,
        })
      }
    }
  })
}
