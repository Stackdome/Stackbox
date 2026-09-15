import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

const LoginRequest = z
  .object({
    email: z.string().min(1).max(320),
    password: z.string().min(1).max(200),
    organization_id: z.string().uuid().optional(),
  })
  .passthrough();
const UserRole = z.enum(["OrgAdmin", "OrgMember"]);
const OrganizationRef = z
  .object({ id: z.string(), name: z.string() })
  .passthrough();
const CurrentUser = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: UserRole,
    organization: OrganizationRef,
  })
  .passthrough();
const Session = z.object({ user: CurrentUser }).passthrough();
const ObjectReference = z
  .object({ id: z.string(), kind: z.string(), href: z.string() })
  .partial()
  .passthrough();
const Error = ObjectReference.and(
  z
    .object({
      code: z.string(),
      reason: z.string(),
      operation_id: z.string(),
      details: z.object({}).partial().passthrough(),
    })
    .partial()
    .passthrough()
);
const Organization = z
  .object({
    id: z.string(),
    name: z.string(),
    budget_cents: z.number().int(),
    created_at: z.string().datetime({ offset: true }),
  })
  .passthrough();
const OrganizationUpdate = z
  .object({
    name: z.string().min(1).max(100).regex(/\S/),
    budget_cents: z.number().int().gte(0),
  })
  .partial()
  .passthrough();
const Member = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: UserRole,
    created_at: z.string().datetime({ offset: true }),
  })
  .passthrough();
const MemberList = z.object({ items: z.array(Member) }).passthrough();
const MemberUpdate = z.object({ role: UserRole }).passthrough();
const InviteStatus = z.enum(["pending", "accepted", "revoked", "expired"]);
const Invite = z
  .object({
    id: z.string(),
    email: z.string(),
    role: UserRole,
    status: InviteStatus,
    expires_at: z.string().datetime({ offset: true }),
    created_at: z.string().datetime({ offset: true }),
  })
  .passthrough();
const InviteList = z.object({ items: z.array(Invite) }).passthrough();
const InviteCreate = z
  .object({ email: z.string().max(320).email(), role: UserRole })
  .passthrough();
const InviteCreated = z
  .object({
    id: z.string(),
    email: z.string(),
    role: UserRole,
    status: InviteStatus,
    expires_at: z.string().datetime({ offset: true }),
    created_at: z.string().datetime({ offset: true }),
    link: z.string(),
  })
  .passthrough();
const InvitePreview = z
  .object({
    organization_name: z.string(),
    email: z.string(),
    role: UserRole,
    status: InviteStatus,
  })
  .passthrough();
const InviteAccept = z
  .object({
    name: z.string().min(1).max(100).regex(/\S/),
    password: z.string().min(8).max(200),
  })
  .passthrough();
const ApiToken = z
  .object({
    id: z.string(),
    name: z.string(),
    prefix: z.string(),
    expires_at: z.string().datetime({ offset: true }).nullable(),
    last_used_at: z.string().datetime({ offset: true }).nullable(),
    created_at: z.string().datetime({ offset: true }),
  })
  .passthrough();
const ApiTokenList = z.object({ items: z.array(ApiToken) }).passthrough();
const ApiTokenExpiryDays = z.union([
  z.literal(30),
  z.literal(90),
  z.literal(365),
]);
const ApiTokenCreate = z
  .object({
    name: z.string().min(1).max(100).regex(/\S/),
    expires_in_days: ApiTokenExpiryDays.nullish(),
  })
  .passthrough();
const ApiTokenCreated = z
  .object({
    id: z.string(),
    name: z.string(),
    prefix: z.string(),
    expires_at: z.string().datetime({ offset: true }).nullable(),
    last_used_at: z.string().datetime({ offset: true }).nullable(),
    created_at: z.string().datetime({ offset: true }),
    secret: z.string(),
  })
  .passthrough();
const ApplicationSummary = z
  .object({ id: z.string(), name: z.string() })
  .passthrough();
const ReportSource = z.enum(["web", "slack", "sentry", "jam", "harness"]);
const TaskReport = z
  .object({ description: z.string(), source: ReportSource })
  .passthrough();
const TaskKind = z.enum(["fix", "onboarding"]);
const TaskPhase = z.enum([
  "intake",
  "preparing",
  "reproducing",
  "implementing",
  "deploying",
  "verifying",
  "hand_over",
  "needs_input",
  "failed",
  "cancelled",
]);
const CoarseStatus = z.enum([
  "running",
  "needs_you",
  "ready_for_review",
  "failed",
  "cancelled",
]);
const TaskResolution = z.enum([
  "fix_verified",
  "fix_unverified",
  "not_reproduced",
  "no_change_needed",
  "abandoned",
]);
const PrState = z.enum(["open", "merged", "closed"]);
const TaskPullRequest = z
  .object({
    number: z.number().int(),
    repository_short_name: z.string(),
    state: PrState,
    is_draft: z.boolean(),
  })
  .passthrough();
const InstanceStatus = z.enum([
  "provisioning",
  "ready",
  "degraded",
  "expired",
  "torn_down",
]);
const TaskInstance = z
  .object({
    id: z.string(),
    url: z.string().nullable(),
    status: InstanceStatus,
    expires_at: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const TaskSummary = z
  .object({
    id: z.string(),
    application: ApplicationSummary,
    report: TaskReport.nullable(),
    kind: TaskKind,
    phase: TaskPhase,
    coarse_status: CoarseStatus,
    resolution: TaskResolution.nullable(),
    run_number: z.number().int().nullable(),
    run_limit: z.number().int(),
    blocking_question: z.string().nullable(),
    pull_request: TaskPullRequest.nullable(),
    instance: TaskInstance.nullable(),
    cost_cents: z.number().int(),
    created_at: z.string().datetime({ offset: true }),
    completed_at: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const TaskList = z
  .object({
    items: z.array(TaskSummary),
    total: z.number().int(),
    needs_you_count: z.number().int(),
  })
  .passthrough();
const TaskCreate = z
  .object({
    application_id: z.string(),
    description: z.string().min(1).max(10000).regex(/\S/),
    expected_behaviour: z.string().max(10000).optional(),
    screenshot_artifact_id: z.string().uuid().optional(),
    target_branch: z.string().min(1).optional(),
    run_limit: z.number().int().gte(1).lte(5).optional().default(2),
    kind: TaskKind.optional().default("fix"),
  })
  .passthrough();
const ArtifactKind = z.enum(["screenshot", "har", "test_log", "recording"]);
const Artifact = z
  .object({
    id: z.string(),
    kind: ArtifactKind,
    url: z.string(),
    meta: z.object({}).partial().passthrough(),
  })
  .passthrough();
const TaskDetailReport = z
  .object({
    description: z.string(),
    expected_behaviour: z.string().nullable(),
    reporter: z.string().nullable(),
    source: ReportSource,
    screenshots: z.array(Artifact),
  })
  .passthrough();
const TaskDetailPullRequest = z
  .object({
    number: z.number().int(),
    repository_full_name: z.string(),
    state: PrState,
    is_draft: z.boolean(),
    head_ref: z.string().nullable(),
    base_ref: z.string().nullable(),
  })
  .passthrough();
const TaskDetail = z
  .object({
    id: z.string(),
    application: ApplicationSummary,
    report: TaskDetailReport.nullable(),
    kind: TaskKind,
    phase: TaskPhase,
    coarse_status: CoarseStatus,
    resolution: TaskResolution.nullable(),
    run_number: z.number().int().nullable(),
    run_limit: z.number().int(),
    blocking_question: z.string().nullable(),
    pull_request: TaskPullRequest.nullable(),
    instance: TaskInstance.nullable(),
    cost_cents: z.number().int(),
    created_at: z.string().datetime({ offset: true }),
    completed_at: z.string().datetime({ offset: true }).nullable(),
    target_branch: z.string().nullable(),
    budget_cents: z.number().int().nullable(),
    pull_requests: z.array(TaskDetailPullRequest),
  })
  .passthrough();
const TaskEventKind = z.enum([
  "phase_changed",
  "instance_requested",
  "budget_exceeded",
  "check_ignored",
  "run_started",
  "run_ended",
  "check_recorded",
  "message_sent",
  "message_send_failed",
]);
const TaskEvent = z
  .object({
    id: z.string(),
    kind: TaskEventKind,
    payload: z.object({}).partial().passthrough(),
    at: z.string().datetime({ offset: true }),
  })
  .passthrough();
const TaskEventList = z.object({ items: z.array(TaskEvent) }).passthrough();
const CheckKind = z.enum([
  "instance_ready",
  "report_reproduced",
  "fix_verified",
]);
const CheckOutcome = z.enum(["passed", "failed", "inconclusive"]);
const TaskCheck = z
  .object({
    id: z.string(),
    kind: CheckKind,
    outcome: CheckOutcome,
    run_number: z.number().int().nullable(),
    commit_sha: z.string().nullable(),
    ran_at: z.string().datetime({ offset: true }),
    artifacts: z.array(Artifact),
  })
  .passthrough();
const TaskCheckList = z.object({ items: z.array(TaskCheck) }).passthrough();
const RunOutcome = z.enum(["running", "passed", "failed", "abandoned"]);
const TaskRun = z
  .object({
    id: z.string(),
    number: z.number().int(),
    outcome: RunOutcome,
    candidate_sha: z.string().nullable(),
    verified_sha: z.string().nullable(),
    started_at: z.string().datetime({ offset: true }),
    ended_at: z.string().datetime({ offset: true }).nullable(),
    cost_cents: z.number().int(),
    failed_check: TaskCheck.nullable(),
  })
  .passthrough();
const TaskRunList = z.object({ items: z.array(TaskRun) }).passthrough();
const MessageRole = z.enum(["user", "agent", "system"]);
const TaskMessage = z
  .object({
    id: z.string(),
    role: MessageRole,
    body: z.string(),
    blocking: z.boolean(),
    answered_at: z.string().datetime({ offset: true }).nullable(),
    replies_to_id: z.string().nullable(),
    created_at: z.string().datetime({ offset: true }),
  })
  .passthrough();
const TaskMessageList = z.object({ items: z.array(TaskMessage) }).passthrough();
const TaskMessageCreate = z
  .object({ body: z.string().min(1).max(4000).regex(/\S/) })
  .passthrough();
const ArtifactList = z.object({ items: z.array(Artifact) }).passthrough();
const RepoProvider = z.enum(["github", "gitlab"]);
const ConnectionStatus = z.enum(["verified", "error"]);
const GitConnection = z
  .object({
    id: z.string(),
    provider: RepoProvider,
    account_login: z.string(),
    status: ConnectionStatus,
    repository_count: z.number().int(),
    created_at: z.string().datetime({ offset: true }),
  })
  .passthrough();
const GitConnectionList = z
  .object({ items: z.array(GitConnection) })
  .passthrough();
const GitConnectionCreate = z
  .object({
    provider: RepoProvider,
    account_login: z.string().min(1).max(100).regex(/\S/),
  })
  .passthrough();
const AvailableRepository = z
  .object({
    external_id: z.string(),
    full_name: z.string(),
    default_branch: z.string(),
  })
  .passthrough();
const AvailableRepositoryList = z
  .object({ items: z.array(AvailableRepository) })
  .passthrough();
const Repository = z
  .object({
    id: z.string(),
    connection_id: z.string(),
    provider: RepoProvider,
    external_id: z.string(),
    full_name: z.string(),
    default_branch: z.string(),
    used_by: z.array(ApplicationSummary),
    created_at: z.string().datetime({ offset: true }),
  })
  .passthrough();
const RepositoryList = z.object({ items: z.array(Repository) }).passthrough();
const RepositoryAdd = z
  .object({
    connection_id: z.string().uuid(),
    external_ids: z.array(z.string().min(1)).min(1).max(50),
  })
  .passthrough();
const RepositoryInUse = z
  .object({
    code: z.string(),
    message: z.string(),
    applications: z.array(ApplicationSummary),
  })
  .passthrough();
const RepositoryRef = z
  .object({ id: z.string(), full_name: z.string(), default_branch: z.string() })
  .passthrough();
const StackfileSync = z.enum([
  "synced",
  "stale",
  "not_synced",
  "validation_failed",
]);
const ApplicationListItem = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    repository: RepositoryRef,
    stackfile_path: z.string().nullable(),
    sync: StackfileSync,
    synced_at_sha: z.string().nullable(),
    service_names: z.array(z.string()),
    task_count: z.number().int(),
  })
  .passthrough();
const ApplicationList = z
  .object({ items: z.array(ApplicationListItem), total: z.number().int() })
  .passthrough();
const ApplicationCreate = z
  .object({
    name: z.string().min(1).max(100).regex(/\S/),
    slug: z
      .string()
      .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/)
      .optional(),
    repository_id: z.string().uuid(),
    stackfile_path: z
      .string()
      .min(1)
      .max(500)
      .regex(/^(?!\/)(?!.*(^|\/)\.\.(\/|$))[^\\]+$/)
      .optional(),
  })
  .passthrough();
const CredentialRef = z
  .object({ name: z.string(), kind: z.string(), ref: z.string() })
  .passthrough();
const ServiceKind = z.enum(["source", "image"]);
const Service = z
  .object({
    id: z.string(),
    name: z.string(),
    path: z.string().nullable(),
    image: z.string().nullable(),
    kind: ServiceKind,
    repository: RepositoryRef.nullable(),
  })
  .passthrough();
const ApplicationDetail = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    repository: RepositoryRef,
    stackfile_path: z.string().nullable(),
    sync: StackfileSync,
    synced_at_sha: z.string().nullable(),
    head_sha: z.string(),
    validated_at: z.string().datetime({ offset: true }).nullable(),
    validation_error: z.string().nullable(),
    credentials: z.array(CredentialRef),
    services: z.array(Service),
    task_count: z.number().int(),
    created_at: z.string().datetime({ offset: true }),
  })
  .passthrough();
const StackfileDetect = z
  .object({
    repository_id: z.string().uuid(),
    stackfile_path: z
      .string()
      .min(1)
      .max(500)
      .regex(/^(?!\/)(?!.*(^|\/)\.\.(\/|$))[^\\]+$/)
      .optional(),
  })
  .passthrough();
const DetectedService = z
  .object({
    name: z.string(),
    path: z.string().nullable(),
    image: z.string().nullable(),
    kind: ServiceKind,
  })
  .passthrough();
const StackfileDetection = z
  .object({
    sha: z.string(),
    services: z.array(DetectedService),
    error: z.string().nullable(),
  })
  .passthrough();
const ApplicationUpdate = z
  .object({
    name: z.string().min(1).max(100).regex(/\S/),
    stackfile_path: z
      .string()
      .min(1)
      .max(500)
      .regex(/^(?!\/)(?!.*(^|\/)\.\.(\/|$))[^\\]+$/),
  })
  .partial()
  .passthrough();
const ServiceList = z.object({ items: z.array(Service) }).passthrough();
const InstancePurpose = z.enum([
  "task",
  "preview",
  "load_test",
  "scratch",
  "persistent",
]);
const InstanceOwner = z
  .object({ id: z.string(), name: z.string() })
  .passthrough();
const InstanceTask = z
  .object({
    id: z.string(),
    description: z.string(),
    coarse_status: CoarseStatus,
  })
  .passthrough();
const ReleaseStatus = z.enum(["queued", "building", "live", "failed"]);
const Release = z
  .object({
    id: z.string(),
    commit_sha: z.string(),
    ref: z.string().nullable(),
    status: ReleaseStatus,
    run_number: z.number().int().nullable(),
    created_at: z.string().datetime({ offset: true }),
  })
  .passthrough();
const InstanceListItem = z
  .object({
    id: z.string(),
    application: ApplicationSummary,
    purpose: InstancePurpose,
    status: InstanceStatus,
    url: z.string().nullable(),
    owner: InstanceOwner.nullable(),
    task: InstanceTask.nullable(),
    latest_release: Release.nullable(),
    expires_at: z.string().datetime({ offset: true }).nullable(),
    created_at: z.string().datetime({ offset: true }),
  })
  .passthrough();
const InstanceList = z
  .object({ items: z.array(InstanceListItem), total: z.number().int() })
  .passthrough();
const InstanceExpiryHours = z.union([
  z.literal(24),
  z.literal(72),
  z.literal(168),
]);
const InstanceSpinUp = z
  .object({
    application_id: z.string().uuid(),
    purpose: InstancePurpose,
    ref: z.string().min(1).max(200).optional(),
    expires_in_hours: InstanceExpiryHours.nullish(),
  })
  .passthrough();
const InstanceDetail = z
  .object({
    id: z.string(),
    application: ApplicationSummary,
    repository: RepositoryRef,
    purpose: InstancePurpose,
    status: InstanceStatus,
    url: z.string().nullable(),
    owner: InstanceOwner.nullable(),
    task: InstanceTask.nullable(),
    latest_release: Release.nullable(),
    expires_at: z.string().datetime({ offset: true }).nullable(),
    created_at: z.string().datetime({ offset: true }),
    releases: z.array(Release),
  })
  .passthrough();
const ReleaseList = z.object({ items: z.array(Release) }).passthrough();
const ReleaseCreate = z
  .object({ ref: z.string().min(1).max(200) })
  .partial()
  .passthrough();
const InstanceExpiryExtend = z
  .object({ hours: InstanceExpiryHours })
  .passthrough();
const SandboxStatus = z.enum(["starting", "running", "stopped", "failed"]);
const ExecutionStatus = z.enum([
  "starting",
  "running",
  "succeeded",
  "failed",
  "timed_out",
  "cancelled",
]);
const ArtifactOwner = z.enum(["report", "task_check", "task_message"]);
const ApplicationRole = z.enum(["Developer", "Viewer"]);
const TaskListQuery = z
  .object({ status: CoarseStatus, application_id: z.string(), q: z.string() })
  .partial()
  .passthrough();

export const schemas = {
  LoginRequest,
  UserRole,
  OrganizationRef,
  CurrentUser,
  Session,
  ObjectReference,
  Error,
  Organization,
  OrganizationUpdate,
  Member,
  MemberList,
  MemberUpdate,
  InviteStatus,
  Invite,
  InviteList,
  InviteCreate,
  InviteCreated,
  InvitePreview,
  InviteAccept,
  ApiToken,
  ApiTokenList,
  ApiTokenExpiryDays,
  ApiTokenCreate,
  ApiTokenCreated,
  ApplicationSummary,
  ReportSource,
  TaskReport,
  TaskKind,
  TaskPhase,
  CoarseStatus,
  TaskResolution,
  PrState,
  TaskPullRequest,
  InstanceStatus,
  TaskInstance,
  TaskSummary,
  TaskList,
  TaskCreate,
  ArtifactKind,
  Artifact,
  TaskDetailReport,
  TaskDetailPullRequest,
  TaskDetail,
  TaskEventKind,
  TaskEvent,
  TaskEventList,
  CheckKind,
  CheckOutcome,
  TaskCheck,
  TaskCheckList,
  RunOutcome,
  TaskRun,
  TaskRunList,
  MessageRole,
  TaskMessage,
  TaskMessageList,
  TaskMessageCreate,
  ArtifactList,
  RepoProvider,
  ConnectionStatus,
  GitConnection,
  GitConnectionList,
  GitConnectionCreate,
  AvailableRepository,
  AvailableRepositoryList,
  Repository,
  RepositoryList,
  RepositoryAdd,
  RepositoryInUse,
  RepositoryRef,
  StackfileSync,
  ApplicationListItem,
  ApplicationList,
  ApplicationCreate,
  CredentialRef,
  ServiceKind,
  Service,
  ApplicationDetail,
  StackfileDetect,
  DetectedService,
  StackfileDetection,
  ApplicationUpdate,
  ServiceList,
  InstancePurpose,
  InstanceOwner,
  InstanceTask,
  ReleaseStatus,
  Release,
  InstanceListItem,
  InstanceList,
  InstanceExpiryHours,
  InstanceSpinUp,
  InstanceDetail,
  ReleaseList,
  ReleaseCreate,
  InstanceExpiryExtend,
  SandboxStatus,
  ExecutionStatus,
  ArtifactOwner,
  ApplicationRole,
  TaskListQuery,
};

const endpoints = makeApi([
  {
    method: "get",
    path: "/api/v1/api-tokens",
    alias: "listApiTokens",
    requestFormat: "json",
    response: ApiTokenList,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/api-tokens",
    alias: "createApiToken",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ApiTokenCreate,
      },
    ],
    response: ApiTokenCreated,
    errors: [
      {
        status: 400,
        description: `The body is invalid`,
        schema: Error,
      },
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
    ],
  },
  {
    method: "delete",
    path: "/api/v1/api-tokens/:token_id",
    alias: "revokeApiToken",
    requestFormat: "json",
    parameters: [
      {
        name: "token_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 404,
        description: `The token is not one of the signed in user&#x27;s`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/auth/login",
    alias: "login",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: LoginRequest,
      },
    ],
    response: Session,
    errors: [
      {
        status: 400,
        description: `The body is invalid`,
        schema: Error,
      },
      {
        status: 401,
        description: `The email and password match no account. The same answer whether or not the email exists.`,
        schema: Error,
      },
      {
        status: 409,
        description: `The email and password match accounts in several organizations and no organization_id was sent`,
        schema: Error,
      },
      {
        status: 429,
        description: `Five failed sign ins for this email inside a fifteen minute window`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/auth/logout",
    alias: "logout",
    requestFormat: "json",
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/auth/refresh",
    alias: "refreshSession",
    requestFormat: "json",
    response: Session,
    errors: [
      {
        status: 401,
        description: `The refresh cookie is missing, expired, or revoked by a sign out, a role change or a removal`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/invites/:token",
    alias: "getInvitePreview",
    requestFormat: "json",
    parameters: [
      {
        name: "token",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: InvitePreview,
    errors: [
      {
        status: 404,
        description: `The token matches no invite`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/invites/:token/accept",
    alias: "acceptInvite",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: InviteAccept,
      },
      {
        name: "token",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: Session,
    errors: [
      {
        status: 400,
        description: `The name is blank or the password is under eight characters`,
        schema: Error,
      },
      {
        status: 404,
        description: `The token matches no invite`,
        schema: Error,
      },
      {
        status: 409,
        description: `The invite was accepted, revoked or has expired, or the email joined in the meantime`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id",
    alias: "getOrganization",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: Organization,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
    ],
  },
  {
    method: "patch",
    path: "/api/v1/organizations/:org_id",
    alias: "updateOrganization",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: OrganizationUpdate,
      },
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: Organization,
    errors: [
      {
        status: 400,
        description: `The name is blank or the budget is negative`,
        schema: Error,
      },
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/applications",
    alias: "listApplications",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ApplicationList,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/organizations/:org_id/applications",
    alias: "createApplication",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ApplicationCreate,
      },
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ApplicationDetail,
    errors: [
      {
        status: 400,
        description: `The body is invalid`,
        schema: Error,
      },
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `The repository is not one of the organization&#x27;s`,
        schema: Error,
      },
      {
        status: 409,
        description: `Another application already uses the slug`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/applications/:application_id",
    alias: "getApplication",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "application_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ApplicationDetail,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Application not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "patch",
    path: "/api/v1/organizations/:org_id/applications/:application_id",
    alias: "updateApplication",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ApplicationUpdate,
      },
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "application_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ApplicationDetail,
    errors: [
      {
        status: 400,
        description: `The body is invalid`,
        schema: Error,
      },
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Application not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "delete",
    path: "/api/v1/organizations/:org_id/applications/:application_id",
    alias: "deleteApplication",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "application_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Application not found`,
        schema: Error,
      },
      {
        status: 409,
        description: `A task of the application has not finished, or one of its instances is not torn down`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/applications/:application_id/services",
    alias: "listApplicationServices",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "application_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ServiceList,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Application not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/organizations/:org_id/applications/:application_id/sync",
    alias: "syncApplication",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "application_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ApplicationDetail,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Application not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/organizations/:org_id/applications/detect",
    alias: "detectStackfile",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: StackfileDetect,
      },
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: StackfileDetection,
    errors: [
      {
        status: 400,
        description: `The body is invalid`,
        schema: Error,
      },
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `The repository is not one of the organization&#x27;s`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/organizations/:org_id/artifacts",
    alias: "uploadArtifact",
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ file: z.instanceof(File) }).passthrough(),
      },
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: Artifact,
    errors: [
      {
        status: 400,
        description: `No file`,
        schema: Error,
      },
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 413,
        description: `The file is larger than 2 MB`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/artifacts/:artifact_id",
    alias: "getArtifact",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "artifact_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: Artifact,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Artifact not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/git-connections",
    alias: "listGitConnections",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: GitConnectionList,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/organizations/:org_id/git-connections",
    alias: "createGitConnection",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: GitConnectionCreate,
      },
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: GitConnection,
    errors: [
      {
        status: 400,
        description: `The body is invalid or the provider refused to list the account&#x27;s repositories`,
        schema: Error,
      },
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 409,
        description: `The organization already connected this provider account`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/git-connections/:connection_id/available-repositories",
    alias: "listAvailableRepositories",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "connection_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: AvailableRepositoryList,
    errors: [
      {
        status: 400,
        description: `The provider refused to list the account&#x27;s repositories`,
        schema: Error,
      },
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Connection not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/organizations/:org_id/git-connections/:connection_id/verify",
    alias: "verifyGitConnection",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "connection_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: GitConnection,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Connection not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/instances",
    alias: "listInstances",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "application_id",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "include_torn_down",
        type: "Query",
        schema: z.boolean().optional().default(false),
      },
    ],
    response: InstanceList,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/organizations/:org_id/instances",
    alias: "spinUpInstance",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: InstanceSpinUp,
      },
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: InstanceDetail,
    errors: [
      {
        status: 400,
        description: `The body is invalid, or the purpose is task`,
        schema: Error,
      },
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `The application is not one of the organization&#x27;s, or the ref does not resolve`,
        schema: Error,
      },
      {
        status: 409,
        description: `The application&#x27;s Stackfile has never synced or failed validation, so there is nothing to run`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/instances/:instance_id",
    alias: "getInstance",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "instance_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: InstanceDetail,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Instance not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/organizations/:org_id/instances/:instance_id/expiry",
    alias: "extendInstanceExpiry",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: InstanceExpiryExtend,
      },
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "instance_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: InstanceDetail,
    errors: [
      {
        status: 400,
        description: `The body is invalid`,
        schema: Error,
      },
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Instance not found`,
        schema: Error,
      },
      {
        status: 409,
        description: `The instance is persistent, or has expired or been torn down`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/instances/:instance_id/releases",
    alias: "listInstanceReleases",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "instance_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ReleaseList,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Instance not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/organizations/:org_id/instances/:instance_id/releases",
    alias: "createRelease",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ ref: z.string().min(1).max(200) })
          .partial()
          .passthrough(),
      },
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "instance_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: Release,
    errors: [
      {
        status: 400,
        description: `The body is invalid`,
        schema: Error,
      },
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Instance not found, or the ref does not resolve`,
        schema: Error,
      },
      {
        status: 409,
        description: `A release is still queued or building, or the instance has expired or been torn down`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/organizations/:org_id/instances/:instance_id/teardown",
    alias: "teardownInstance",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "instance_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: InstanceDetail,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Instance not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/invites",
    alias: "listInvites",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: InviteList,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/organizations/:org_id/invites",
    alias: "createInvite",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: InviteCreate,
      },
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: InviteCreated,
    errors: [
      {
        status: 400,
        description: `The body is invalid`,
        schema: Error,
      },
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 409,
        description: `The email is already a member, or already has a pending invite`,
        schema: Error,
      },
    ],
  },
  {
    method: "delete",
    path: "/api/v1/organizations/:org_id/invites/:invite_id",
    alias: "revokeInvite",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "invite_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/repositories",
    alias: "listRepositories",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: RepositoryList,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/organizations/:org_id/repositories",
    alias: "addRepositories",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RepositoryAdd,
      },
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: RepositoryList,
    errors: [
      {
        status: 400,
        description: `The body is invalid or the provider refused to list the account&#x27;s repositories`,
        schema: Error,
      },
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `The connection is unknown or the provider does not list one of the external ids`,
        schema: Error,
      },
    ],
  },
  {
    method: "delete",
    path: "/api/v1/organizations/:org_id/repositories/:repository_id",
    alias: "removeRepository",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "repository_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Repository not found`,
        schema: Error,
      },
      {
        status: 409,
        description: `Applications still use the repository`,
        schema: RepositoryInUse,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/tasks",
    alias: "listTasks",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "status",
        type: "Query",
        schema: z
          .enum([
            "running",
            "needs_you",
            "ready_for_review",
            "failed",
            "cancelled",
          ])
          .optional(),
      },
      {
        name: "application_id",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "q",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: TaskList,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/organizations/:org_id/tasks",
    alias: "createTask",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: TaskCreate,
      },
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: TaskDetail,
    errors: [
      {
        status: 400,
        description: `The body is invalid or names an unsupported task kind`,
        schema: Error,
      },
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Application not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/tasks/:task_id",
    alias: "getTask",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "task_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: TaskDetail,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Task not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/tasks/:task_id/artifacts",
    alias: "listTaskArtifacts",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "task_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ArtifactList,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Task not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/organizations/:org_id/tasks/:task_id/cancel",
    alias: "cancelTask",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "task_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: TaskSummary,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Task not found`,
        schema: Error,
      },
      {
        status: 409,
        description: `The task has already finished`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/tasks/:task_id/checks",
    alias: "listTaskChecks",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "task_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: TaskCheckList,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Task not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/tasks/:task_id/events",
    alias: "listTaskEvents",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "task_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: TaskEventList,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Task not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/tasks/:task_id/messages",
    alias: "listTaskMessages",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "task_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: TaskMessageList,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Task not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/organizations/:org_id/tasks/:task_id/messages",
    alias: "createTaskMessage",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ body: z.string().min(1).max(4000).regex(/\S/) })
          .passthrough(),
      },
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "task_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: TaskMessage,
    errors: [
      {
        status: 400,
        description: `The body is empty`,
        schema: Error,
      },
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Task not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/tasks/:task_id/runs",
    alias: "listTaskRuns",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "task_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: TaskRunList,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `Task not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/users",
    alias: "listMembers",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: MemberList,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
    ],
  },
  {
    method: "patch",
    path: "/api/v1/organizations/:org_id/users/:user_id",
    alias: "updateMember",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: MemberUpdate,
      },
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "user_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: Member,
    errors: [
      {
        status: 400,
        description: `The body is invalid`,
        schema: Error,
      },
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 404,
        description: `The organization has no such member`,
        schema: Error,
      },
      {
        status: 409,
        description: `The organization&#x27;s last admin would lose the role, or the caller targets their own account`,
        schema: Error,
      },
    ],
  },
  {
    method: "delete",
    path: "/api/v1/organizations/:org_id/users/:user_id",
    alias: "removeMember",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "user_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
      {
        status: 403,
        description: `Unauthorized to perform operation`,
        schema: Error,
      },
      {
        status: 409,
        description: `The member is the organization&#x27;s last admin, or the caller&#x27;s own account`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/users/current",
    alias: "getCurrentUser",
    requestFormat: "json",
    response: CurrentUser,
    errors: [
      {
        status: 401,
        description: `Auth token is invalid`,
        schema: Error,
      },
    ],
  },
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
