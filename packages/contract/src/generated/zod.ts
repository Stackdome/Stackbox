import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

const Organisation = z
  .object({
    id: z.string(),
    name: z.string(),
    is_platform: z.boolean(),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
  })
  .partial()
  .passthrough();
const UserSignupRequest = z
  .object({
    name: z.string(),
    email: z.string().email(),
    password: z.string(),
    organisation: Organisation.optional(),
    invite_token: z.string().optional(),
    turnstile_token: z.string().optional(),
  })
  .passthrough();
const UserRole = z.enum(["OrgAdmin", "OrgMember"]);
const User = z
  .object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    email: z.string().email(),
    organisation: z.string(),
    role: UserRole,
    organisation_id: z.string(),
  })
  .partial()
  .passthrough();
const UserSignupResponse = z
  .object({ user: User, jwt_token: z.string(), refresh_token: z.string() })
  .partial()
  .passthrough();
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
const TurnstileConfigResponse = z
  .object({ enabled: z.boolean(), site_key: z.string(), action: z.string() })
  .passthrough();
const SignupConfigResponse = z
  .object({ turnstile: TurnstileConfigResponse })
  .passthrough();
const AppConfigResponse = z
  .object({ github_oauth: z.boolean(), signup: SignupConfigResponse })
  .partial()
  .passthrough();
const LoginRequest = z
  .object({ email: z.string(), password: z.string() })
  .passthrough();
const LoginResponse = z
  .object({
    token: z.string(),
    refresh_token: z.string(),
    user: User,
    expires_in: z.number().int(),
  })
  .partial()
  .passthrough();
const RefreshTokenRequest = z
  .object({ refreshToken: z.string() })
  .passthrough();
const RefreshTokenResponse = z
  .object({ token: z.string(), refreshToken: z.string() })
  .partial()
  .passthrough();
const APITokenCreateRequest = z
  .object({
    name: z.string(),
    scopes: z.array(z.string()),
    resource_ids: z.array(z.string()).optional(),
    expires_at: z.string().datetime({ offset: true }).optional(),
  })
  .passthrough();
const APITokenCreateResponse = z
  .object({
    token: z.string(),
    id: z.string(),
    name: z.string(),
    token_prefix: z.string(),
    expires_at: z.string().datetime({ offset: true }),
  })
  .partial()
  .passthrough();
const APIToken = z
  .object({
    id: z.string(),
    name: z.string(),
    user_id: z.string(),
    token_prefix: z.string(),
    scopes: z.array(z.string()),
    resource_ids: z.array(z.string()),
    org_id: z.string(),
    expires_at: z.string().datetime({ offset: true }),
    last_used_at: z.string().datetime({ offset: true }),
    created_at: z.string().datetime({ offset: true }),
    revoked_at: z.string().datetime({ offset: true }),
  })
  .partial()
  .passthrough();
const APITokenList = z
  .object({ items: z.array(APIToken) })
  .partial()
  .passthrough();
const ScopeResource = z
  .object({ resource: z.string(), actions: z.array(z.string()) })
  .partial()
  .passthrough();
const ScopeList = z
  .object({
    full_access_scope: z.string(),
    items: z.array(ScopeResource),
    total: z.number().int(),
  })
  .partial()
  .passthrough();
const UserList = z
  .object({
    items: z.array(User),
    total: z.number().int(),
    page: z.number().int(),
    page_size: z.number().int(),
    total_pages: z.number().int(),
  })
  .partial()
  .passthrough();
const PromoteAdminRequest = z.object({ user_id: z.string() }).passthrough();
const OrgInviteCreateRequest = z
  .object({
    email: z.string().email(),
    role: z.enum(["Developer", "Viewer"]),
    expires_in_days: z.number().int().gte(1).lte(30),
  })
  .passthrough();
const InviteStatus = z.enum(["pending", "accepted", "revoked", "expired"]);
const OrgInviteCreateResponse = z
  .object({
    id: z.string(),
    email: z.string(),
    organisation_id: z.string(),
    role: z.string(),
    status: InviteStatus,
    expires_at: z.string().datetime({ offset: true }),
    invited_by: z.string(),
    email_sent: z.boolean(),
    invite_token: z.string(),
    created_at: z.string().datetime({ offset: true }),
  })
  .partial()
  .passthrough();
const OrgInvite = z
  .object({
    id: z.string(),
    email: z.string(),
    organisation_id: z.string(),
    role: z.enum(["Developer", "Viewer"]),
    status: InviteStatus,
    expires_at: z.string().datetime({ offset: true }),
    invited_by: z.string(),
    email_sent: z.boolean(),
    email_error: z.string(),
    created_at: z.string().datetime({ offset: true }),
    accepted_at: z.string().datetime({ offset: true }),
  })
  .partial()
  .passthrough();
const OrgInviteList = z
  .object({ items: z.array(OrgInvite), total: z.number().int() })
  .partial()
  .passthrough();
const OrgInviteInfo = z
  .object({
    org_name: z.string(),
    inviter_name: z.string(),
    expires_at: z.string().datetime({ offset: true }),
  })
  .partial()
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
  Organisation,
  UserSignupRequest,
  UserRole,
  User,
  UserSignupResponse,
  ObjectReference,
  Error,
  TurnstileConfigResponse,
  SignupConfigResponse,
  AppConfigResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  APITokenCreateRequest,
  APITokenCreateResponse,
  APIToken,
  APITokenList,
  ScopeResource,
  ScopeList,
  UserList,
  PromoteAdminRequest,
  OrgInviteCreateRequest,
  InviteStatus,
  OrgInviteCreateResponse,
  OrgInvite,
  OrgInviteList,
  OrgInviteInfo,
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
    method: "post",
    path: "/api/v1/api-tokens",
    alias: "postApiv1apiTokens",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: APITokenCreateRequest,
      },
    ],
    response: APITokenCreateResponse,
    errors: [
      {
        status: 400,
        description: `Invalid request data`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/api-tokens",
    alias: "getApiv1apiTokens",
    requestFormat: "json",
    response: APITokenList,
  },
  {
    method: "get",
    path: "/api/v1/api-tokens/:id",
    alias: "getApiv1apiTokensId",
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: APIToken,
    errors: [
      {
        status: 404,
        description: `API token not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "delete",
    path: "/api/v1/api-tokens/:id",
    alias: "deleteApiv1apiTokensId",
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 404,
        description: `API token not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/api-tokens/scopes",
    alias: "getApiv1apiTokensscopes",
    description: `Returns the list of resources and their allowed actions that can be used when creating API tokens`,
    requestFormat: "json",
    response: ScopeList,
    errors: [
      {
        status: 401,
        description: `Unauthorized`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/auth/github",
    alias: "getApiv1authgithub",
    description: `Redirects the user to GitHub for OAuth authorization`,
    requestFormat: "json",
    response: z.void(),
    errors: [
      {
        status: 302,
        description: `Redirect to GitHub OAuth authorization page`,
        schema: z.void(),
      },
      {
        status: 500,
        description: `Internal server error`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/auth/github/callback",
    alias: "getApiv1authgithubcallback",
    description: `Handles the callback from GitHub after OAuth authorization`,
    requestFormat: "json",
    parameters: [
      {
        name: "code",
        type: "Query",
        schema: z.string(),
      },
      {
        name: "state",
        type: "Query",
        schema: z.string(),
      },
    ],
    response: LoginResponse,
    errors: [
      {
        status: 401,
        description: `OAuth authorization failed`,
        schema: Error,
      },
      {
        status: 500,
        description: `Internal server error`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/auth/login",
    alias: "postApiv1authlogin",
    description: `Authenticate user and generate an access token`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: LoginRequest,
      },
    ],
    response: LoginResponse,
    errors: [
      {
        status: 401,
        description: `Invalid credentials`,
        schema: Error,
      },
      {
        status: 500,
        description: `Internal server error`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/auth/refresh",
    alias: "postApiv1authrefresh",
    description: `Exchange a refresh token for a new access token`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ refreshToken: z.string() }).passthrough(),
      },
    ],
    response: RefreshTokenResponse,
    errors: [
      {
        status: 401,
        description: `Invalid or expired refresh token`,
        schema: Error,
      },
      {
        status: 500,
        description: `Internal server error`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/config",
    alias: "getApiv1config",
    description: `Returns feature flags the web client needs before authentication, such as whether GitHub OAuth is enabled.`,
    requestFormat: "json",
    response: AppConfigResponse,
    errors: [
      {
        status: 500,
        description: `Internal server error`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/invites/:token/info",
    alias: "getApiv1invitesTokeninfo",
    requestFormat: "json",
    parameters: [
      {
        name: "token",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: OrgInviteInfo,
    errors: [
      {
        status: 404,
        description: `Invite not found`,
        schema: z.void(),
      },
      {
        status: 410,
        description: `Invite expired or revoked`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:id",
    alias: "getApiv1organizationsId",
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: Organisation,
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
        status: 500,
        description: `Internal server error`,
        schema: Error,
      },
    ],
  },
  {
    method: "put",
    path: "/api/v1/organizations/:id",
    alias: "putApiv1organizationsId",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: Organisation,
      },
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: Organisation,
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
        status: 500,
        description: `Internal server error`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/organizations/:org_id/admins",
    alias: "postApiv1organizationsOrg_idadmins",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ user_id: z.string() }).passthrough(),
      },
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `Invalid request data`,
        schema: Error,
      },
      {
        status: 401,
        description: `Unauthorized`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Forbidden`,
        schema: z.void(),
      },
      {
        status: 500,
        description: `Internal server error`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/admins",
    alias: "getApiv1organizationsOrg_idadmins",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: UserList,
    errors: [
      {
        status: 401,
        description: `Unauthorized`,
        schema: z.void(),
      },
      {
        status: 500,
        description: `Internal server error`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/organizations/:org_id/admins/:user_id/demote",
    alias: "postApiv1organizationsOrg_idadminsUser_iddemote",
    description: `Demotes an OrgAdmin.`,
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
        status: 400,
        description: `Bad request`,
        schema: z.void(),
      },
      {
        status: 401,
        description: `Unauthorized`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Forbidden`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `User not found`,
        schema: z.void(),
      },
      {
        status: 500,
        description: `Internal server error`,
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
    method: "post",
    path: "/api/v1/organizations/:org_id/invites",
    alias: "postApiv1organizationsOrg_idinvites",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: OrgInviteCreateRequest,
      },
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: OrgInviteCreateResponse,
    errors: [
      {
        status: 400,
        description: `Invalid request data`,
        schema: Error,
      },
      {
        status: 401,
        description: `Unauthorized`,
        schema: z.void(),
      },
      {
        status: 409,
        description: `Conflict - user exists or duplicate pending invite`,
        schema: Error,
      },
      {
        status: 500,
        description: `Internal server error`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/invites",
    alias: "getApiv1organizationsOrg_idinvites",
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
        schema: z.string().optional(),
      },
    ],
    response: OrgInviteList,
    errors: [
      {
        status: 401,
        description: `Unauthorized`,
        schema: z.void(),
      },
      {
        status: 500,
        description: `Internal server error`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/invites/:id",
    alias: "getApiv1organizationsOrg_idinvitesId",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: OrgInvite,
    errors: [
      {
        status: 401,
        description: `Unauthorized`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Invite not found`,
        schema: z.void(),
      },
      {
        status: 500,
        description: `Internal server error`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "delete",
    path: "/api/v1/organizations/:org_id/invites/:id",
    alias: "deleteApiv1organizationsOrg_idinvitesId",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `Can only revoke pending invites`,
        schema: z.void(),
      },
      {
        status: 401,
        description: `Unauthorized`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Invite not found`,
        schema: z.void(),
      },
      {
        status: 500,
        description: `Internal server error`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/organizations/:org_id/invites/:id/resend",
    alias: "postApiv1organizationsOrg_idinvitesIdresend",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 400,
        description: `Can only resend pending invites`,
        schema: z.void(),
      },
      {
        status: 401,
        description: `Unauthorized`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Invite not found`,
        schema: z.void(),
      },
      {
        status: 500,
        description: `Internal server error`,
        schema: z.void(),
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
    alias: "getApiv1organizationsOrg_idusers",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().optional().default(1),
      },
      {
        name: "page_size",
        type: "Query",
        schema: z.number().int().optional().default(20),
      },
    ],
    response: UserList,
    errors: [
      {
        status: 401,
        description: `Unauthorized`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Forbidden`,
        schema: z.void(),
      },
      {
        status: 500,
        description: `Internal server error`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/api/v1/user-signup",
    alias: "postApiv1userSignup",
    description: `Create a new user`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: UserSignupRequest,
      },
    ],
    response: UserSignupResponse,
    errors: [
      {
        status: 400,
        description: `Invalid request data`,
        schema: Error,
      },
      {
        status: 409,
        description: `User already exists`,
        schema: Error,
      },
      {
        status: 500,
        description: `Internal server error`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/users/:id",
    alias: "getApiv1usersId",
    description: `Get a user`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: User,
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
        status: 500,
        description: `Internal server error`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/users/current",
    alias: "getApiv1userscurrent",
    requestFormat: "json",
    response: User,
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
        status: 500,
        description: `Internal server error`,
        schema: Error,
      },
    ],
  },
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
