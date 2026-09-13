import {
  ApplicationRole,
  ArtifactKind,
  ArtifactOwner,
  CheckKind,
  CheckOutcome,
  ConnectionStatus,
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
  TaskKind,
  TaskPhase,
  TaskResolution,
  UserRole,
} from '@stackbox/contract'
import { sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

function valuesOf<T extends string>(members: Record<string, T>): [T, ...T[]] {
  return Object.values(members) as [T, ...T[]]
}

export const repoProvider = pgEnum('repo_provider', valuesOf(RepoProvider))
export const connectionStatus = pgEnum('connection_status', valuesOf(ConnectionStatus))
export const instancePurpose = pgEnum('instance_purpose', valuesOf(InstancePurpose))
export const instanceStatus = pgEnum('instance_status', valuesOf(InstanceStatus))
export const releaseStatus = pgEnum('release_status', valuesOf(ReleaseStatus))
export const reportSource = pgEnum('report_source', valuesOf(ReportSource))
export const taskKind = pgEnum('task_kind', valuesOf(TaskKind))
export const taskPhase = pgEnum('task_phase', valuesOf(TaskPhase))
export const taskResolution = pgEnum('task_resolution', valuesOf(TaskResolution))
export const runOutcome = pgEnum('run_outcome', valuesOf(RunOutcome))
export const sandboxStatus = pgEnum('sandbox_status', valuesOf(SandboxStatus))
export const executionStatus = pgEnum('execution_status', valuesOf(ExecutionStatus))
export const checkKind = pgEnum('check_kind', valuesOf(CheckKind))
export const checkOutcome = pgEnum('check_outcome', valuesOf(CheckOutcome))
export const artifactOwner = pgEnum('artifact_owner', valuesOf(ArtifactOwner))
export const artifactKind = pgEnum('artifact_kind', valuesOf(ArtifactKind))
export const prState = pgEnum('pr_state', valuesOf(PrState))
export const messageRole = pgEnum('message_role', valuesOf(MessageRole))
export const orgRole = pgEnum('org_role', valuesOf(UserRole))
export const applicationRole = pgEnum('application_role', valuesOf(ApplicationRole))

const id = () => uuid('id').primaryKey().defaultRandom()
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const happenedAt = (name: string) => timestamp(name, { withTimezone: true }).notNull().defaultNow()
const optionalAt = (name: string) => timestamp(name, { withTimezone: true })

export const organization = pgTable('organization', {
  id: id(),
  name: text('name').notNull(),
  budgetCents: integer('budget_cents').notNull().default(0),
  createdAt: createdAt(),
})

export const userAccount = pgTable(
  'user_account',
  {
    id: id(),
    orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    name: text('name'),
    passwordHash: text('password_hash'),
    orgRole: orgRole('org_role').notNull().default(UserRole.OrgMember),
    createdAt: createdAt(),
  },
  (t) => [unique('user_account_org_email_unique').on(t.orgId, t.email)],
)

export const repository = pgTable(
  'repository',
  {
    id: id(),
    orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    provider: repoProvider('provider').notNull(),
    externalId: text('external_id').notNull(),
    fullName: text('full_name').notNull(),
    defaultBranch: text('default_branch').notNull().default('main'),
    createdAt: createdAt(),
  },
  (t) => [unique('repository_org_provider_external_unique').on(t.orgId, t.provider, t.externalId)],
)

export const gitConnection = pgTable(
  'git_connection',
  {
    id: id(),
    orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    provider: repoProvider('provider').notNull(),
    installationRef: text('installation_ref').notNull(),
    accountLogin: text('account_login'),
    status: connectionStatus('status').notNull().default(ConnectionStatus.Verified),
    createdAt: createdAt(),
  },
  (t) => [unique('git_connection_org_provider_installation_unique').on(t.orgId, t.provider, t.installationRef)],
)

export const application = pgTable(
  'application',
  {
    id: id(),
    orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    repositoryId: uuid('repository_id').notNull().references(() => repository.id),
    stackfilePath: text('stackfile_path'),
    syncedAtSha: text('synced_at_sha'),
    validatedAt: optionalAt('validated_at'),
    credentialsRef: jsonb('credentials_ref').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [unique('application_org_slug_unique').on(t.orgId, t.slug)],
)

export const service = pgTable(
  'service',
  {
    id: id(),
    applicationId: uuid('application_id').notNull().references(() => application.id, { onDelete: 'cascade' }),
    repositoryId: uuid('repository_id').references(() => repository.id),
    name: text('name').notNull(),
    path: text('path'),
    image: text('image'),
  },
  (t) => [
    unique('service_application_name_unique').on(t.applicationId, t.name),
    check('service_source_check', sql.raw('repository_id is not null or image is not null')),
  ],
)

export const applicationInstance = pgTable(
  'application_instance',
  {
    id: id(),
    applicationId: uuid('application_id').notNull().references(() => application.id, { onDelete: 'cascade' }),
    purpose: instancePurpose('purpose').notNull(),
    taskId: uuid('task_id').references((): AnyPgColumn => task.id),
    createdBy: uuid('created_by').references(() => userAccount.id),
    url: text('url'),
    status: instanceStatus('status').notNull().default(InstanceStatus.Provisioning),
    expiresAt: optionalAt('expires_at'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('application_instance_live_task_unique')
      .on(t.taskId)
      .where(sql.raw(`task_id is not null and status <> '${InstanceStatus.TornDown}'`)),
  ],
)

export const release = pgTable(
  'release',
  {
    id: id(),
    instanceId: uuid('instance_id').notNull().references(() => applicationInstance.id, { onDelete: 'cascade' }),
    runId: uuid('run_id').references((): AnyPgColumn => run.id),
    commitSha: text('commit_sha').notNull(),
    ref: text('ref'),
    status: releaseStatus('status').notNull().default(ReleaseStatus.Queued),
    createdAt: createdAt(),
  },
  (t) => [index('release_instance_created_idx').on(t.instanceId, t.createdAt.desc())],
)

export const report = pgTable('report', {
  id: id(),
  applicationId: uuid('application_id').notNull().references(() => application.id, { onDelete: 'cascade' }),
  source: reportSource('source').notNull(),
  description: text('description').notNull(),
  expectedBehaviour: text('expected_behaviour'),
  reporter: text('reporter'),
  externalRef: text('external_ref'),
  createdAt: createdAt(),
})

export const task = pgTable(
  'task',
  {
    id: id(),
    applicationId: uuid('application_id').notNull().references(() => application.id, { onDelete: 'cascade' }),
    reportId: uuid('report_id').references(() => report.id),
    instanceId: uuid('instance_id').references((): AnyPgColumn => applicationInstance.id),
    originReleaseId: uuid('origin_release_id').references((): AnyPgColumn => release.id),
    kind: taskKind('kind').notNull().default(TaskKind.Fix),
    targetBranch: text('target_branch'),
    phase: taskPhase('phase').notNull().default(TaskPhase.Intake),
    resolution: taskResolution('resolution'),
    runLimit: smallint('run_limit').notNull().default(2),
    budgetCents: integer('budget_cents'),
    costCents: integer('cost_cents').notNull().default(0),
    leaseOwner: text('lease_owner'),
    leaseExpiresAt: optionalAt('lease_expires_at'),
    createdAt: createdAt(),
    completedAt: optionalAt('completed_at'),
  },
  (t) => [
    check(
      'task_resolution_terminal_check',
      sql.raw(
        `resolution is null or phase in ('${TaskPhase.HandOver}', '${TaskPhase.Failed}', '${TaskPhase.Cancelled}')`,
      ),
    ),
    index('task_application_phase_idx').on(t.applicationId, t.phase),
    index('task_needs_input_idx').on(t.phase).where(sql.raw(`phase = '${TaskPhase.NeedsInput}'`)),
  ],
)

export const run = pgTable(
  'run',
  {
    id: id(),
    taskId: uuid('task_id').notNull().references(() => task.id, { onDelete: 'cascade' }),
    number: smallint('number').notNull(),
    candidateSha: text('candidate_sha'),
    verifiedSha: text('verified_sha'),
    outcome: runOutcome('outcome').notNull().default(RunOutcome.Running),
    startedAt: happenedAt('started_at'),
    endedAt: optionalAt('ended_at'),
  },
  (t) => [unique('run_task_number_unique').on(t.taskId, t.number)],
)

export const sandbox = pgTable('sandbox', {
  id: id(),
  taskId: uuid('task_id').notNull().references(() => task.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  externalId: text('external_id'),
  status: sandboxStatus('status').notNull().default(SandboxStatus.Starting),
  createdAt: createdAt(),
  stoppedAt: optionalAt('stopped_at'),
})

export const execution = pgTable('execution', {
  id: id(),
  sandboxId: uuid('sandbox_id').notNull().references(() => sandbox.id, { onDelete: 'cascade' }),
  taskId: uuid('task_id').notNull().references(() => task.id, { onDelete: 'cascade' }),
  runId: uuid('run_id').references(() => run.id),
  externalId: text('external_id'),
  sessionRef: text('session_ref'),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  status: executionStatus('status').notNull().default(ExecutionStatus.Starting),
  costCents: integer('cost_cents').notNull().default(0),
  eventCursor: text('event_cursor'),
  startedAt: happenedAt('started_at'),
  endedAt: optionalAt('ended_at'),
})

export const taskCheck = pgTable(
  'task_check',
  {
    id: id(),
    taskId: uuid('task_id').notNull().references(() => task.id, { onDelete: 'cascade' }),
    runId: uuid('run_id').references(() => run.id),
    releaseId: uuid('release_id').references(() => release.id),
    executionId: uuid('execution_id').references(() => execution.id),
    itemId: text('item_id'),
    kind: checkKind('kind').notNull(),
    outcome: checkOutcome('outcome').notNull(),
    commitSha: text('commit_sha'),
    ranAt: happenedAt('ran_at'),
  },
  (t) => [
    check('task_check_fix_verified_release_check', sql.raw(`kind <> '${CheckKind.FixVerified}' or release_id is not null`)),
    index('task_check_task_ran_idx').on(t.taskId, t.ranAt),
  ],
)

export const pullRequest = pgTable(
  'pull_request',
  {
    id: id(),
    taskId: uuid('task_id').references(() => task.id),
    repositoryId: uuid('repository_id').notNull().references(() => repository.id),
    number: integer('number').notNull(),
    headRef: text('head_ref'),
    baseRef: text('base_ref'),
    isDraft: boolean('is_draft').notNull().default(true),
    state: prState('state').notNull().default(PrState.Open),
  },
  (t) => [
    unique('pull_request_repository_number_unique').on(t.repositoryId, t.number),
    uniqueIndex('pull_request_task_unique').on(t.taskId).where(sql.raw('task_id is not null')),
  ],
)

export const artifact = pgTable(
  'artifact',
  {
    id: id(),
    ownerType: artifactOwner('owner_type').notNull(),
    ownerId: uuid('owner_id').notNull(),
    kind: artifactKind('kind').notNull(),
    url: text('url').notNull(),
    meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index('artifact_owner_idx').on(t.ownerType, t.ownerId)],
)

export const taskMessage = pgTable(
  'task_message',
  {
    id: id(),
    taskId: uuid('task_id').notNull().references(() => task.id, { onDelete: 'cascade' }),
    executionId: uuid('execution_id').references(() => execution.id),
    repliesToId: uuid('replies_to_id').references((): AnyPgColumn => taskMessage.id),
    role: messageRole('role').notNull(),
    body: text('body').notNull(),
    blocking: boolean('blocking').notNull().default(false),
    answeredAt: optionalAt('answered_at'),
    createdAt: createdAt(),
  },
  (t) => [
    index('task_message_task_created_idx').on(t.taskId, t.createdAt),
    index('task_message_open_blocking_idx').on(t.taskId).where(sql.raw('blocking and answered_at is null')),
  ],
)

export const taskEvent = pgTable(
  'task_event',
  {
    id: id(),
    taskId: uuid('task_id').notNull().references(() => task.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    at: happenedAt('at'),
  },
  (t) => [index('task_event_task_at_idx').on(t.taskId, t.at)],
)

export const policy = pgTable(
  'policy',
  {
    id: id(),
    orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    subject: text('subject').notNull(),
    resource: text('resource').notNull(),
    action: text('action').notNull(),
  },
  (t) => [unique('policy_org_subject_resource_action_unique').on(t.orgId, t.subject, t.resource, t.action)],
)

export const roleBinding = pgTable(
  'role_binding',
  {
    id: id(),
    orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => userAccount.id, { onDelete: 'cascade' }),
    subject: text('subject').notNull(),
    scope: text('scope').notNull(),
  },
  (t) => [unique('role_binding_org_user_subject_scope_unique').on(t.orgId, t.userId, t.subject, t.scope)],
)
