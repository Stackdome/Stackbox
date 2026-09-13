import {
  ApplicationRole,
  MessageRole,
  PrState,
  RepoProvider,
  ReportSource,
  RunOutcome,
  TaskKind,
  TaskPhase,
  TaskResolution,
  UserRole,
} from '@stackbox/contract'
import { eq, inArray } from 'drizzle-orm'
import { defaultPolicies } from '../access/calc/default-policies'
import { ORG_SCOPE } from '../access/types'
import type { Database } from './client'
import {
  application,
  organization,
  policy,
  pullRequest,
  report,
  repository,
  roleBinding,
  run,
  task,
  taskMessage,
  userAccount,
} from './schema'

export const FIXTURE = {
  organizationName: 'acme',
  adminEmail: 'ada@example.com',
  viewerEmail: 'vik@example.com',
  password: 'password',
} as const

const APPLICATIONS = ['shop', 'billing'] as const
type ApplicationName = (typeof APPLICATIONS)[number]

type FixtureTask = {
  application: ApplicationName
  description: string
  phase: TaskPhase
  resolution: TaskResolution | null
  runs: number
  createdHoursAgo: number
  completedHoursAgo: number | null
  question: string | null
  pullRequest: { number: number; isDraft: boolean; state: PrState } | null
}

const TASKS: FixtureTask[] = [
  { application: 'shop', description: 'Checkout button does nothing on Safari', phase: TaskPhase.NeedsInput, resolution: null, runs: 1, createdHoursAgo: 2, completedHoursAgo: null, question: 'Which Safari version shows the dead button?', pullRequest: null },
  { application: 'billing', description: 'Invoice PDF shows the wrong currency symbol', phase: TaskPhase.NeedsInput, resolution: null, runs: 2, createdHoursAgo: 30, completedHoursAgo: null, question: "Should the symbol follow the customer's locale or the store's?", pullRequest: { number: 57, isDraft: true, state: PrState.Open } },
  { application: 'shop', description: 'Search returns nothing for accented names', phase: TaskPhase.Reproducing, resolution: null, runs: 1, createdHoursAgo: 1, completedHoursAgo: null, question: null, pullRequest: null },
  { application: 'billing', description: 'Discount code is ignored in the cart total', phase: TaskPhase.Deploying, resolution: null, runs: 2, createdHoursAgo: 5, completedHoursAgo: null, question: null, pullRequest: { number: 58, isDraft: true, state: PrState.Open } },
  { application: 'shop', description: 'Password reset link expires immediately', phase: TaskPhase.HandOver, resolution: TaskResolution.FixVerified, runs: 1, createdHoursAgo: 48, completedHoursAgo: 40, question: null, pullRequest: { number: 142, isDraft: false, state: PrState.Merged } },
  { application: 'shop', description: 'Profile photo upload times out', phase: TaskPhase.HandOver, resolution: TaskResolution.NotReproduced, runs: 1, createdHoursAgo: 72, completedHoursAgo: 70, question: null, pullRequest: null },
  { application: 'billing', description: 'Order export drops the last row', phase: TaskPhase.Failed, resolution: null, runs: 2, createdHoursAgo: 96, completedHoursAgo: 90, question: null, pullRequest: null },
  { application: 'shop', description: 'Dark mode resets after a reload', phase: TaskPhase.Cancelled, resolution: TaskResolution.Abandoned, runs: 1, createdHoursAgo: 120, completedHoursAgo: 119, question: null, pullRequest: null },
]

const LAST_RUN_OUTCOME: Partial<Record<TaskPhase, RunOutcome>> = {
  [TaskPhase.HandOver]: RunOutcome.Passed,
  [TaskPhase.Failed]: RunOutcome.Failed,
  [TaskPhase.Cancelled]: RunOutcome.Abandoned,
}

function hoursBefore(now: Date, hours: number): Date {
  return new Date(now.getTime() - hours * 60 * 60 * 1000)
}

export async function seed(db: Database, options: { passwordHash: string; now: Date }): Promise<void> {
  const { passwordHash, now } = options
  await db.transaction(async (tx) => {
    const previous = await tx.select({ orgId: userAccount.orgId }).from(userAccount).where(eq(userAccount.email, FIXTURE.adminEmail))
    if (previous.length > 0) {
      const orgIds = previous.map((row) => row.orgId)
      // pull_request does not cascade from task or repository, so it goes first.
      const repositories = tx.select({ id: repository.id }).from(repository).where(inArray(repository.orgId, orgIds))
      await tx.delete(pullRequest).where(inArray(pullRequest.repositoryId, repositories))
      await tx.delete(organization).where(inArray(organization.id, orgIds))
    }

    const [org] = await tx.insert(organization).values({ name: FIXTURE.organizationName, budgetCents: 50_000 }).returning({ id: organization.id })
    const [ada, vik] = await tx
      .insert(userAccount)
      .values([
        { orgId: org.id, email: FIXTURE.adminEmail, name: 'Ada Lovelace', passwordHash, orgRole: UserRole.OrgAdmin },
        { orgId: org.id, email: FIXTURE.viewerEmail, name: 'Vik Rao', passwordHash, orgRole: UserRole.OrgMember },
      ])
      .returning({ id: userAccount.id })

    const repositoryIds = new Map<ApplicationName, string>()
    const applicationIds = new Map<ApplicationName, string>()
    for (const name of APPLICATIONS) {
      const [repo] = await tx
        .insert(repository)
        .values({ orgId: org.id, provider: RepoProvider.Github, externalId: `acme-${name}`, fullName: `acme/${name}` })
        .returning({ id: repository.id })
      const [app] = await tx
        .insert(application)
        .values({ orgId: org.id, name, slug: name, repositoryId: repo.id })
        .returning({ id: application.id })
      repositoryIds.set(name, repo.id)
      applicationIds.set(name, app.id)
    }

    await tx.insert(policy).values(defaultPolicies(org.id))
    await tx.insert(roleBinding).values([
      { orgId: org.id, userId: ada.id, subject: UserRole.OrgAdmin, scope: ORG_SCOPE },
      { orgId: org.id, userId: vik.id, subject: UserRole.OrgMember, scope: ORG_SCOPE },
      { orgId: org.id, userId: vik.id, subject: ApplicationRole.Viewer, scope: applicationIds.get('shop') as string },
    ])

    for (const fixture of TASKS) {
      const applicationId = applicationIds.get(fixture.application) as string
      const createdAt = hoursBefore(now, fixture.createdHoursAgo)
      const [written] = await tx
        .insert(report)
        .values({ applicationId, source: ReportSource.Web, description: fixture.description, createdAt })
        .returning({ id: report.id })
      const [created] = await tx
        .insert(task)
        .values({
          applicationId,
          reportId: written.id,
          kind: TaskKind.Fix,
          targetBranch: 'main',
          phase: fixture.phase,
          resolution: fixture.resolution,
          runLimit: 2,
          createdAt,
          completedAt: fixture.completedHoursAgo === null ? null : hoursBefore(now, fixture.completedHoursAgo),
        })
        .returning({ id: task.id })
      await tx.insert(run).values(
        Array.from({ length: fixture.runs }, (_, index) => ({
          taskId: created.id,
          number: index + 1,
          outcome: index + 1 < fixture.runs ? RunOutcome.Failed : (LAST_RUN_OUTCOME[fixture.phase] ?? RunOutcome.Running),
          startedAt: createdAt,
        })),
      )
      if (fixture.question) {
        await tx.insert(taskMessage).values({ taskId: created.id, role: MessageRole.Agent, body: fixture.question, blocking: true, createdAt })
      }
      if (fixture.pullRequest) {
        await tx.insert(pullRequest).values({
          taskId: created.id,
          repositoryId: repositoryIds.get(fixture.application) as string,
          headRef: `stackbox/${created.id}`,
          baseRef: 'main',
          ...fixture.pullRequest,
        })
      }
    }
  })
}
