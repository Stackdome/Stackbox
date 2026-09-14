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
const GitHubAppManifestFlow = z
  .object({
    manifest: z.object({}).partial().passthrough(),
    github_url: z.string(),
    state: z.string(),
  })
  .partial()
  .passthrough();
const GitInstallation = z
  .object({
    id: z.string(),
    installation_id: z.number().int(),
    account_login: z.string(),
    account_type: z.string(),
    repository_selection: z.string(),
    created_at: z.string().datetime({ offset: true }),
  })
  .partial()
  .passthrough();
const GitInstallationList = z
  .object({ items: z.array(GitInstallation), total: z.number().int() })
  .partial()
  .passthrough();
const GitRepository = z
  .object({
    full_name: z.string(),
    clone_url: z.string(),
    default_branch: z.string(),
    private: z.boolean(),
    pushed_at: z.string().datetime({ offset: true }),
    owner: z.string(),
  })
  .partial()
  .passthrough();
const GitRepositoryPage = z
  .object({
    items: z.array(GitRepository),
    page: z.number().int(),
    total_count: z.number().int(),
    has_next: z.boolean(),
  })
  .partial()
  .passthrough();
const GitBranchList = z
  .object({ items: z.array(z.string()), total: z.number().int() })
  .partial()
  .passthrough();
const GitIntegrationType = z.enum(["git_credentials", "github_app"]);
const GitIntegrationBasicAuth = z.object({
  username: z.string(),
  password: z.string(),
});
const GitIntegrationAuth = z
  .object({ token: z.string(), basic: GitIntegrationBasicAuth })
  .partial();
const GitIntegration = z.object({
  id: z.string().optional(),
  type: GitIntegrationType.optional().default("git_credentials"),
  host: z.string(),
  status: z.enum(["active", "pending_install", "installed"]).optional(),
  auth: GitIntegrationAuth.optional(),
  credentials_configured: z.boolean().optional(),
  install_url: z.string().optional(),
  organisation_id: z.string().optional(),
  created_at: z.string().datetime({ offset: true }).optional(),
  updated_at: z.string().datetime({ offset: true }).optional(),
});
const GitIntegrationList = z
  .object({ items: z.array(GitIntegration), total: z.number().int() })
  .partial()
  .passthrough();
const GitIntegrationVerifyRequest = z.object({ repo_url: z.string() });
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
const Label = z.object({ key: z.string(), value: z.string() });
const Annotation = z
  .object({ key: z.string(), value: z.string() })
  .passthrough();
const PushTarget = z.object({
  repository: z.string(),
  registry_credentials_id: z.string().optional(),
});
const GitSource = z.object({
  repo_url: z.string(),
  branch: z.string().optional(),
  tag: z.string().optional(),
  commit: z.string().optional(),
  dockerfile_path: z.string().optional().default("Dockerfile"),
  build_context: z.string().optional().default("."),
  integration_id: z.string().optional(),
  push: PushTarget.optional(),
});
const ImageSource = z.object({
  ref: z.string(),
  registry_credentials_id: z.string().optional(),
});
const VolumeBuildSource = z
  .object({
    volume_id: z.string(),
    volume_name: z.string(),
    current_volume_hash: z.string(),
    dockerfile_path: z.string().default("Dockerfile"),
    build_context: z.string().default("."),
  })
  .partial();
const SourceSpec = z
  .object({ git: GitSource, image: ImageSource, volume: VolumeBuildSource })
  .partial();
const InitSpec = z
  .object({ command: z.array(z.string()), args: z.array(z.string()) })
  .partial();
const EnvVar = z.object({
  name: z.string(),
  value: z.string().optional(),
  self_output: z.string().optional(),
});
const ExecutionConfig = z
  .object({
    command: z.array(z.string()),
    args: z.array(z.string()),
    environment_variables: z.array(EnvVar),
  })
  .partial()
  .passthrough();
const VolumeMountSourceType = z.enum([
  "EmptyVolume",
  "RemoteDirSyncedVolume",
  "BuildArtifactSyncedVolume",
  "GitRepoSyncedVolume",
]);
const VolumeMount = z
  .object({
    instance_resource_id: z.string().optional(),
    source_volume_type: VolumeMountSourceType.optional(),
    source_volume_name: z.string(),
    source_sub_path: z.string().optional(),
    target_path: z.string(),
  })
  .passthrough();
const LifecycleConfig = z
  .object({ restart_request_time: z.string().datetime({ offset: true }) })
  .partial()
  .passthrough();
const Port = z
  .object({
    name: z.string(),
    number: z.number().int(),
    protocol: z.string().optional(),
    exposed_to_public: z.boolean(),
    subdomain_prefix: z.string().optional(),
  })
  .passthrough();
const OutputDescriptor = z
  .object({
    name: z.string(),
    type: z.enum(["string", "integer", "boolean"]),
    sensitive: z.boolean(),
  })
  .passthrough();
const ApplicationInstanceResource = z
  .object({
    id: z.string().optional(),
    instance_id: z.string().optional(),
    name: z.string(),
    labels: z.array(Label).optional(),
    annotations: z.array(Annotation).optional(),
    revision: z.string().optional(),
    source: SourceSpec.optional(),
    init_spec: InitSpec.optional(),
    execution_config: ExecutionConfig.optional(),
    volume_mounts: z.array(VolumeMount).optional(),
    depends_on: z.array(z.string()).optional(),
    lifecycle_config: LifecycleConfig.optional(),
    ports: z.array(Port).optional(),
    outputs: z.array(OutputDescriptor).optional(),
    workload_type: z
      .enum(["Service", "StatefulService", "Worker", "Job", "CronJob"])
      .optional()
      .default("Service"),
    schedule: z.string().optional(),
    replicas: z.number().int().gte(0).optional(),
  })
  .passthrough();
const TopologyNodeRef = z
  .object({
    type: z.enum([
      "stack_resource",
      "addon/postgres",
      "secret",
      "volume",
      "object_store",
    ]),
    id: z.string().optional(),
    name: z.string().optional(),
  })
  .passthrough();
const ConnectionTarget = z
  .object({
    type: z.enum(["env", "file"]),
    name: z.string().optional(),
    path: z.string().optional(),
  })
  .passthrough();
const OutputValueRef = z.object({ output: z.string() }).passthrough();
const ValueRef = z
  .object({
    output: z.string(),
    template: z.string(),
    values: z.record(OutputValueRef),
  })
  .partial()
  .passthrough();
const ConnectionMapping = z
  .object({ target: ConnectionTarget, value: ValueRef })
  .passthrough();
const PostgresEnvConfig = z
  .object({
    database: z.string(),
    credential_scope: z.enum(["owner", "superuser"]),
    superuser: z.boolean(),
  })
  .partial();
const VolumeMountConfig = z.object({
  mount_path: z.string(),
  sub_path: z.string().optional(),
  read_only: z.boolean().optional(),
});
const BuildArtifactSourceConfig = z.object({
  source_path: z.string(),
  destination_path: z.string().optional(),
});
const ApplicationInstanceConnectionConfig = z.union([
  PostgresEnvConfig,
  VolumeMountConfig,
  BuildArtifactSourceConfig,
]);
const ApplicationInstanceConnection = z
  .object({
    id: z.string().optional(),
    kind: z.enum(["env", "volume_mount", "build_artifact_source"]),
    from: TopologyNodeRef,
    to: TopologyNodeRef,
    mappings: z.array(ConnectionMapping).optional(),
    config: ApplicationInstanceConnectionConfig.optional(),
  })
  .passthrough();
const ApplicationInstanceSpec = z
  .object({
    instance_resources: z.array(ApplicationInstanceResource),
    connections: z.array(ApplicationInstanceConnection),
  })
  .partial()
  .passthrough();
const ApplicationInstanceSettings = z
  .object({
    release_retention_limit: z.number().int().default(10),
    min_successful_releases: z.number().int().default(5),
  })
  .partial()
  .passthrough();
const InstanceLifecycle = z.enum(["active", "deleting"]);
const ReleaseState = z.enum([
  "Pending",
  "InProgress",
  "Released",
  "Failed",
  "Superseded",
  "Cancelled",
]);
const ReleaseHealth = z.enum([
  "ok",
  "progressing",
  "degraded",
  "unavailable",
  "failed",
]);
const ReleaseSummary = z
  .object({
    id: z.string(),
    sequence: z.number().int(),
    state: ReleaseState,
    health: ReleaseHealth,
    message: z.string(),
    created_at: z.string().datetime({ offset: true }),
    completed_at: z.string().datetime({ offset: true }),
  })
  .partial()
  .passthrough();
const ApplicationInstance = z
  .object({
    id: z.string().optional(),
    organisation_id: z.string().optional(),
    user_id: z.string().optional(),
    name: z.string(),
    namespace: z.string().optional(),
    labels: z.array(Label).optional(),
    annotations: z.array(Annotation).optional(),
    revision: z.string().optional(),
    spec: ApplicationInstanceSpec,
    settings: ApplicationInstanceSettings.optional(),
    lifecycle: InstanceLifecycle.optional(),
    converged_release: ReleaseSummary.optional(),
    latest_release: ReleaseSummary.optional(),
    created_at: z.string().datetime({ offset: true }).optional(),
    updated_at: z.string().datetime({ offset: true }).optional(),
  })
  .passthrough();
const ApplicationInstanceList = z
  .object({ items: z.array(ApplicationInstance), total: z.number().int() })
  .partial()
  .passthrough();
const ResourceMetrics = z
  .object({
    assigned_nodes: z.array(z.string()),
    cpu_usage: z.string(),
    memory_usage: z.string(),
    node_capacities: z.array(
      z
        .object({
          node_name: z.string(),
          cpu_capacity: z.string(),
          memory_capacity: z.string(),
          storage_capacity: z.string(),
        })
        .partial()
        .passthrough()
    ),
    timestamp: z.string().datetime({ offset: true }),
  })
  .partial()
  .passthrough();
const ApplicationInstanceResourceList = z
  .object({
    items: z.array(ApplicationInstanceResource),
    total: z.number().int(),
  })
  .partial()
  .passthrough();
const GitRepoRevision = z
  .object({ branch: z.string(), tag: z.string(), commit: z.string() })
  .partial()
  .passthrough();
const BuildSourceRevision = z
  .object({
    volume_source_revision: z
      .object({ current_volume_hash: z.string() })
      .passthrough(),
    git_repo_revision: GitRepoRevision,
  })
  .partial()
  .passthrough();
const BuildSourceContext = z
  .object({
    volume: z
      .object({ id: z.string(), name: z.string().optional() })
      .passthrough(),
    git_repo: z.object({ repo_url: z.string() }).passthrough(),
  })
  .partial()
  .passthrough();
const Condition = z
  .object({
    type: z.string(),
    status: z.string(),
    observed_generation: z.number().int(),
    last_transition_time: z.string().datetime({ offset: true }),
    reason: z.string(),
    message: z.string(),
  })
  .partial();
const BuildFailureDetail = z
  .object({
    failure_type: z.enum([
      "crash_loop",
      "out_of_memory",
      "image_pull_failed",
      "create_container_error",
      "exit_error",
      "port_not_listening",
    ]),
    reason: z.string(),
    message: z.string(),
    restart_count: z.number().int(),
    exit_code: z.number().int(),
  })
  .partial()
  .passthrough();
const ImageBuildStatus = z
  .object({
    state: z.string(),
    conditions: z.array(Condition),
    image_url: z.string(),
    build_source_revision: z.string(),
    last_build_failure_detail: BuildFailureDetail,
  })
  .partial()
  .passthrough();
const ImageBuild = z
  .object({
    id: z.string().optional(),
    namespace: z.string().optional(),
    instance_id: z.string().optional(),
    instance_resource_id: z.string(),
    instance_resource_name: z.string(),
    source_revision: BuildSourceRevision,
    build_context: BuildSourceContext,
    image_repo: z.string(),
    status: ImageBuildStatus.optional(),
    created_at: z.string().datetime({ offset: true }).optional(),
    updated_at: z.string().datetime({ offset: true }).optional(),
  })
  .passthrough();
const ImageBuildList = z
  .object({ items: z.array(ImageBuild), total: z.number().int() })
  .partial()
  .passthrough();
const TopologyNode = z
  .object({
    ref: TopologyNodeRef,
    label: z.string(),
    outputs: z.array(OutputDescriptor).optional(),
    state: z.string().optional(),
  })
  .passthrough();
const TopologyEdge = z
  .object({
    id: z.string().optional(),
    kind: z.enum([
      "env",
      "volume_mount",
      "build_artifact_source",
      "depends_on",
    ]),
    source: TopologyNodeRef,
    target: TopologyNodeRef,
    mappings: z.array(ConnectionMapping).optional(),
    config: ApplicationInstanceConnectionConfig.optional(),
    source_of_truth: z.enum(["connection", "derived"]),
  })
  .passthrough();
const ApplicationInstanceTopology = z
  .object({ nodes: z.array(TopologyNode), edges: z.array(TopologyEdge) })
  .passthrough();
const ApplicationInstanceConnectionList = z
  .object({
    items: z.array(ApplicationInstanceConnection),
    total: z.number().int(),
  })
  .partial()
  .passthrough();
const CreateReleaseRequest = z
  .object({ from_release_id: z.string() })
  .partial()
  .passthrough();
const ReleaseCauseKind = z.enum([
  "manual",
  "rollback",
  "webhook_push",
  "preview_sync",
]);
const ReleaseCause = z
  .object({ kind: ReleaseCauseKind, detail: z.string() })
  .partial()
  .passthrough();
const ResourcePins = z
  .object({
    git_sha: z.string(),
    volume_hash: z.string(),
    image_digest: z.string(),
  })
  .partial()
  .passthrough();
const ReleasePins = z
  .object({ resources: z.record(ResourcePins) })
  .partial()
  .passthrough();
const ResourceOutcome = z
  .object({
    phase: z.string(),
    ready_replicas: z.number().int(),
    replicas: z.number().int(),
    message: z.string(),
  })
  .partial()
  .passthrough();
const ReleaseOutcome = z
  .object({ resources: z.record(ResourceOutcome), duration: z.string() })
  .partial()
  .passthrough();
const ReleaseValidationError = z
  .object({
    resource_name: z.string(),
    field: z.string(),
    code: z.enum([
      "resource_name_required",
      "resource_name_invalid",
      "resource_name_duplicate",
      "source_required",
      "source_conflict",
      "workload_type_invalid",
      "schedule_required",
      "schedule_not_allowed",
      "schedule_invalid",
      "replicas_invalid",
      "ports_not_allowed",
      "public_port_not_http",
      "port_protocol_invalid",
      "port_name_invalid",
      "port_number_invalid",
      "port_name_duplicate",
      "port_number_duplicate",
      "subdomain_duplicate",
      "domain_not_configured",
      "env_name_required",
      "env_name_duplicate",
      "env_value_missing",
      "env_value_conflict",
      "env_self_output_unknown",
      "volume_mount_invalid",
      "volume_not_found",
      "volume_hash_missing",
      "secret_not_found",
      "git_integration_not_found",
      "registry_credential_not_found",
      "self_dependency",
      "duplicate_dependency",
      "unknown_dependency",
      "dependency_cycle",
      "git_repo_url_required",
      "git_branch_tag_conflict",
      "git_commit_invalid",
      "git_commit_requires_ref",
      "image_ref_required",
      "image_ref_invalid",
      "push_target_required",
      "push_target_conflict",
      "push_ref_invalid",
      "git_repo_unreachable",
      "git_auth_failed",
      "git_branch_not_found",
      "git_tag_not_found",
      "git_rate_limited",
      "image_not_found",
      "registry_credentials_required",
      "registry_auth_failed",
      "push_access_denied",
      "stack_name_invalid",
      "stack_settings_invalid",
      "connection_invalid",
    ]),
    message: z.string(),
  })
  .partial()
  .passthrough();
const Ingress = z
  .object({ url: z.string(), target_port: z.number().int() })
  .partial()
  .passthrough();
const ContainerFailureDetail = z
  .object({
    failure_type: z.enum([
      "crash_loop",
      "out_of_memory",
      "image_pull_failed",
      "create_container_error",
      "exit_error",
      "port_not_listening",
    ]),
    reason: z.string(),
    message: z.string(),
    restart_count: z.number().int(),
    exit_code: z.number().int(),
  })
  .partial()
  .passthrough();
const ApplicationInstanceResourceFailure = z
  .object({
    type: z.enum(["runtime_crash", "build_failure", "readiness_failure"]),
    container: ContainerFailureDetail,
    init_container: ContainerFailureDetail,
    build: BuildFailureDetail,
  })
  .partial()
  .passthrough();
const ApplicationInstanceResourceStatus = z
  .object({
    public_ingress: z.array(Ingress),
    internal_service_name: z.string(),
    last_restart_request_processed_at: z.string().datetime({ offset: true }),
    state: z.string(),
    message: z.string(),
    observed_revision: z.string(),
    conditions: z.array(Condition),
    last_failure: ApplicationInstanceResourceFailure,
    replicas: z.number().int(),
    available_replicas: z.number().int(),
    updated_replicas: z.number().int(),
    last_run_time: z.string().datetime({ offset: true }),
    last_run_succeeded: z.boolean(),
  })
  .partial()
  .passthrough();
const ReleaseLiveStatus = z
  .object({
    health: ReleaseHealth,
    resources: z.record(ApplicationInstanceResourceStatus),
    conditions: z.array(Condition),
    target_revision: z.string(),
    observed_revision: z.string(),
  })
  .partial()
  .passthrough();
const Release = z
  .object({
    id: z.string(),
    instance_id: z.string(),
    sequence: z.number().int(),
    state: ReleaseState,
    message: z.string(),
    cause: ReleaseCause,
    snapshot_revision: z.string(),
    manifest_revision: z.string(),
    renderer_version: z.string(),
    pins: ReleasePins,
    outcome: ReleaseOutcome,
    created_by: z.string(),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    rendered_at: z.string().datetime({ offset: true }),
    completed_at: z.string().datetime({ offset: true }),
    validation_errors: z.array(ReleaseValidationError),
    live_status: ReleaseLiveStatus,
  })
  .partial()
  .passthrough();
const ReleaseList = z
  .object({
    items: z.array(Release),
    total: z.number().int(),
    page: z.number().int(),
    page_size: z.number().int(),
    total_pages: z.number().int(),
  })
  .partial()
  .passthrough();
const ReleaseSnapshot = z
  .object({
    instance: z
      .object({
        id: z.string(),
        organisation_id: z.string(),
        cluster_id: z.string(),
        user_id: z.string(),
        name: z.string(),
        namespace_id: z.string(),
        namespace: z.string(),
        labels: z.record(z.string()),
        annotations: z.record(z.string()),
      })
      .partial()
      .passthrough(),
    resources: z.array(ApplicationInstanceResource),
    connections: z.array(ApplicationInstanceConnection),
    captured_at: z.string().datetime({ offset: true }),
  })
  .partial()
  .passthrough();
const ReleaseDetail = Release.and(
  z.object({ snapshot: ReleaseSnapshot }).partial().passthrough()
);
const ReleaseEventLink = z
  .object({ kind: z.string(), label: z.string(), target: z.record(z.string()) })
  .partial()
  .passthrough();
const ReleaseEvent = z
  .object({
    id: z.string(),
    release_id: z.string(),
    instance_id: z.string(),
    sequence: z.number().int(),
    occurred_at: z.string().datetime({ offset: true }),
    source: z.enum(["hub", "cluster"]),
    scope: z.enum(["release", "resource"]),
    resource_name: z.string(),
    type: z.string(),
    level: z.enum(["info", "success", "warning", "error"]),
    message: z.string(),
    links: z.array(ReleaseEventLink),
    metadata: z.record(z.string()),
  })
  .partial()
  .passthrough();
const ReleaseEventList = z
  .object({
    items: z.array(ReleaseEvent),
    next_after_sequence: z.number().int(),
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
    description: z.string().min(1).regex(/\S/),
    expected_behaviour: z.string().optional(),
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
  .object({ body: z.string().min(1).regex(/\S/) })
  .passthrough();
const ArtifactList = z.object({ items: z.array(Artifact) }).passthrough();
const ApplicationList = z
  .object({ items: z.array(ApplicationSummary), total: z.number().int() })
  .passthrough();
const RepoProvider = z.enum(["github", "gitlab"]);
const ConnectionStatus = z.enum(["verified", "error"]);
const InstancePurpose = z.enum([
  "task",
  "preview",
  "load_test",
  "scratch",
  "persistent",
]);
const ReleaseStatus = z.enum(["queued", "building", "live", "failed"]);
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
  GitHubAppManifestFlow,
  GitInstallation,
  GitInstallationList,
  GitRepository,
  GitRepositoryPage,
  GitBranchList,
  GitIntegrationType,
  GitIntegrationBasicAuth,
  GitIntegrationAuth,
  GitIntegration,
  GitIntegrationList,
  GitIntegrationVerifyRequest,
  PromoteAdminRequest,
  OrgInviteCreateRequest,
  InviteStatus,
  OrgInviteCreateResponse,
  OrgInvite,
  OrgInviteList,
  OrgInviteInfo,
  Label,
  Annotation,
  PushTarget,
  GitSource,
  ImageSource,
  VolumeBuildSource,
  SourceSpec,
  InitSpec,
  EnvVar,
  ExecutionConfig,
  VolumeMountSourceType,
  VolumeMount,
  LifecycleConfig,
  Port,
  OutputDescriptor,
  ApplicationInstanceResource,
  TopologyNodeRef,
  ConnectionTarget,
  OutputValueRef,
  ValueRef,
  ConnectionMapping,
  PostgresEnvConfig,
  VolumeMountConfig,
  BuildArtifactSourceConfig,
  ApplicationInstanceConnectionConfig,
  ApplicationInstanceConnection,
  ApplicationInstanceSpec,
  ApplicationInstanceSettings,
  InstanceLifecycle,
  ReleaseState,
  ReleaseHealth,
  ReleaseSummary,
  ApplicationInstance,
  ApplicationInstanceList,
  ResourceMetrics,
  ApplicationInstanceResourceList,
  GitRepoRevision,
  BuildSourceRevision,
  BuildSourceContext,
  Condition,
  BuildFailureDetail,
  ImageBuildStatus,
  ImageBuild,
  ImageBuildList,
  TopologyNode,
  TopologyEdge,
  ApplicationInstanceTopology,
  ApplicationInstanceConnectionList,
  CreateReleaseRequest,
  ReleaseCauseKind,
  ReleaseCause,
  ResourcePins,
  ReleasePins,
  ResourceOutcome,
  ReleaseOutcome,
  ReleaseValidationError,
  Ingress,
  ContainerFailureDetail,
  ApplicationInstanceResourceFailure,
  ApplicationInstanceResourceStatus,
  ReleaseLiveStatus,
  Release,
  ReleaseList,
  ReleaseSnapshot,
  ReleaseDetail,
  ReleaseEventLink,
  ReleaseEvent,
  ReleaseEventList,
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
  ApplicationList,
  RepoProvider,
  ConnectionStatus,
  InstancePurpose,
  ReleaseStatus,
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
    path: "/api/v1/git-integrations/github/manifest/callback",
    alias: "getApiv1gitIntegrationsgithubmanifestcallback",
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
    response: z.void(),
    errors: [
      {
        status: 302,
        description: `Redirects the browser to the GitHub App install page`,
        schema: z.void(),
      },
      {
        status: 400,
        description: `Invalid or expired state`,
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
    path: "/api/v1/git-integrations/github/setup",
    alias: "getApiv1gitIntegrationsgithubsetup",
    requestFormat: "json",
    parameters: [
      {
        name: "installation_id",
        type: "Query",
        schema: z.number().int(),
      },
      {
        name: "state",
        type: "Query",
        schema: z.string(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 302,
        description: `Redirects the browser back to the git integrations page`,
        schema: z.void(),
      },
      {
        status: 400,
        description: `Invalid or expired state`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `The installation was not found on the platform app`,
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
    method: "post",
    path: "/api/v1/organizations/:org_id/git-integrations",
    alias: "postApiv1organizationsOrg_idgitIntegrations",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: GitIntegration,
      },
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: GitIntegration,
    errors: [
      {
        status: 400,
        description: `Invalid request payload`,
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
        status: 409,
        description: `An integration for this host already exists`,
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
    path: "/api/v1/organizations/:org_id/git-integrations",
    alias: "getApiv1organizationsOrg_idgitIntegrations",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: GitIntegrationList,
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
        schema: z.void(),
      },
    ],
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/git-integrations/:id",
    alias: "getApiv1organizationsOrg_idgitIntegrationsId",
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
    response: GitIntegration,
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
        status: 404,
        description: `Git integration not found`,
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
    method: "put",
    path: "/api/v1/organizations/:org_id/git-integrations/:id",
    alias: "putApiv1organizationsOrg_idgitIntegrationsId",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: GitIntegration,
      },
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
    response: GitIntegration,
    errors: [
      {
        status: 400,
        description: `Invalid request payload`,
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
        description: `Git integration not found`,
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
    path: "/api/v1/organizations/:org_id/git-integrations/:id",
    alias: "deleteApiv1organizationsOrg_idgitIntegrationsId",
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
        description: `Git integration not found`,
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
    path: "/api/v1/organizations/:org_id/git-integrations/:id/installations",
    alias: "getApiv1organizationsOrg_idgitIntegrationsIdinstallations",
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
      {
        name: "refresh",
        type: "Query",
        schema: z.boolean().optional().default(false),
      },
    ],
    response: GitInstallationList,
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
        status: 404,
        description: `Git integration not found`,
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
    path: "/api/v1/organizations/:org_id/git-integrations/:id/repositories",
    alias: "getApiv1organizationsOrg_idgitIntegrationsIdrepositories",
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
      {
        name: "page",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "installation_id",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: GitRepositoryPage,
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
        status: 404,
        description: `Git integration not found`,
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
    path: "/api/v1/organizations/:org_id/git-integrations/:id/repositories/:owner/:repo",
    alias: "getApiv1organizationsOrg_idgitIntegrationsIdrepositoriesOwnerRepo",
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
      {
        name: "owner",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "repo",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: GitRepository,
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
        status: 404,
        description: `Not found`,
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
    path: "/api/v1/organizations/:org_id/git-integrations/:id/repositories/:owner/:repo/branches",
    alias:
      "getApiv1organizationsOrg_idgitIntegrationsIdrepositoriesOwnerRepobranches",
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
      {
        name: "owner",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "repo",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: GitBranchList,
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
        status: 404,
        description: `Not found`,
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
    path: "/api/v1/organizations/:org_id/git-integrations/:id/verify",
    alias: "postApiv1organizationsOrg_idgitIntegrationsIdverify",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ repo_url: z.string() }),
      },
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
        description: `Verification failed`,
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
        status: 404,
        description: `Git integration not found`,
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
    path: "/api/v1/organizations/:org_id/git-integrations/github/manifest",
    alias: "postApiv1organizationsOrg_idgitIntegrationsgithubmanifest",
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: GitHubAppManifestFlow,
    errors: [
      {
        status: 400,
        description: `The hub external URL is not configured`,
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
        status: 409,
        description: `A GitHub App is already installed`,
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
    path: "/api/v1/organizations/:org_id/instances",
    alias: "getApiv1organizationsOrg_idinstances",
    description: `Returns instances the user has access to in the org. OrgAdmins see all instances in the org.`,
    requestFormat: "json",
    parameters: [
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().optional().default(20),
      },
      {
        name: "offset",
        type: "Query",
        schema: z.number().int().optional().default(0),
      },
    ],
    response: ApplicationInstanceList,
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
    path: "/api/v1/organizations/:org_id/instances",
    alias: "postApiv1organizationsOrg_idinstances",
    description: `Creates a thin instance shell (name, labels, annotations, settings). Any inline
&#x60;stack_resources&#x60;, &#x60;volumes&#x60;, or &#x60;connections&#x60; in the body are ignored. Add
children via &#x60;PUT /instances/{id}/apply&#x60; or the individual sub-resource endpoints.
`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ApplicationInstance,
      },
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ApplicationInstance,
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
        description: `ApplicationInstance already exists`,
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
    path: "/api/v1/organizations/:org_id/instances/:id",
    alias: "getApiv1organizationsOrg_idinstancesId",
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
    response: ApplicationInstance,
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
    method: "put",
    path: "/api/v1/organizations/:org_id/instances/:id",
    alias: "putApiv1organizationsOrg_idinstancesId",
    description: `Updates only shell fields (name, labels, annotations, settings). &#x60;namespace&#x60; is
immutable. Child collections (&#x60;stack_resources&#x60;, &#x60;volumes&#x60;, &#x60;connections&#x60;) in the
body are ignored. Use &#x60;PUT /instances/{id}/apply&#x60; for a full reconcile.
`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ApplicationInstance,
      },
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
    response: ApplicationInstance,
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
        status: 500,
        description: `Internal server error`,
        schema: Error,
      },
    ],
  },
  {
    method: "delete",
    path: "/api/v1/organizations/:org_id/instances/:id",
    alias: "deleteApiv1organizationsOrg_idinstancesId",
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
    response: ApplicationInstance,
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
    method: "put",
    path: "/api/v1/organizations/:org_id/instances/:id/apply",
    alias: "applyApplicationInstance",
    description: `Declarative whole-document apply. Reconciles the instance against the supplied
document: resources and connections not present in the body are deleted, while
volumes are add-only and are never deleted. This is the only endpoint that
accepts a full instance document.
`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ApplicationInstance,
      },
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
    response: ApplicationInstance,
    errors: [
      {
        status: 400,
        description: `Invalid request data. &#x60;details&#x60; carries a &#x60;ValidationErrorDetail&#x60; payload when the failure is an aggregated field validation error.`,
        schema: Error,
      },
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
    method: "get",
    path: "/api/v1/organizations/:org_id/instances/:id/builds",
    alias: "getApiv1organizationsOrg_idinstancesIdbuilds",
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
    response: ImageBuildList,
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
    method: "get",
    path: "/api/v1/organizations/:org_id/instances/:id/builds/:build_id",
    alias: "getApiv1organizationsOrg_idinstancesIdbuildsBuild_id",
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
      {
        name: "build_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ImageBuild,
    errors: [
      {
        status: 401,
        description: `Unauthorized`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Build not found`,
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
    path: "/api/v1/organizations/:org_id/instances/:id/builds/:build_id/logs",
    alias: "getApiv1organizationsOrg_idinstancesIdbuildsBuild_idlogs",
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
      {
        name: "build_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "follow",
        type: "Query",
        schema: z.boolean().optional().default(false),
      },
      {
        name: "tail",
        type: "Query",
        schema: z.number().int().optional().default(200),
      },
      {
        name: "since",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `Unauthorized`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Build not found`,
        schema: z.void(),
      },
      {
        status: 409,
        description: `Build job not created yet, or build pod not started. Retry later`,
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
    path: "/api/v1/organizations/:org_id/instances/:id/connections",
    alias: "getApiv1organizationsOrg_idinstancesIdconnections",
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
    response: ApplicationInstanceConnectionList,
    errors: [
      {
        status: 401,
        description: `Unauthorized`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `ApplicationInstance not found`,
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
    path: "/api/v1/organizations/:org_id/instances/:id/connections",
    alias: "postApiv1organizationsOrg_idinstancesIdconnections",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ApplicationInstanceConnection,
      },
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
    response: ApplicationInstanceConnection,
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
        status: 404,
        description: `ApplicationInstance not found`,
        schema: z.void(),
      },
      {
        status: 409,
        description: `ApplicationInstance connection already exists`,
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
    path: "/api/v1/organizations/:org_id/instances/:id/connections/:connection_id",
    alias: "putApiv1organizationsOrg_idinstancesIdconnectionsConnection_id",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ApplicationInstanceConnection,
      },
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
      {
        name: "connection_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ApplicationInstanceConnection,
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
        status: 404,
        description: `ApplicationInstance or connection not found`,
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
    method: "delete",
    path: "/api/v1/organizations/:org_id/instances/:id/connections/:connection_id",
    alias: "deleteApiv1organizationsOrg_idinstancesIdconnectionsConnection_id",
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
      {
        name: "connection_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `Unauthorized`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `ApplicationInstance or connection not found`,
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
    path: "/api/v1/organizations/:org_id/instances/:id/logs",
    alias: "getApiv1organizationsOrg_idinstancesIdlogs",
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
      {
        name: "follow",
        type: "Query",
        schema: z.boolean().optional().default(false),
      },
      {
        name: "tail",
        type: "Query",
        schema: z.number().int().optional().default(100),
      },
      {
        name: "since",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: z.void(),
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
    method: "get",
    path: "/api/v1/organizations/:org_id/instances/:id/metrics",
    alias: "getApiv1organizationsOrg_idinstancesIdmetrics",
    description: `Returns metrics for a instance. If &#x60;stream&#x3D;true&#x60; is passed, the server responds using Server-Sent Events (SSE).
`,
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
      {
        name: "stream",
        type: "Query",
        schema: z.boolean().optional().default(false),
      },
    ],
    response: ResourceMetrics,
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
    path: "/api/v1/organizations/:org_id/instances/:id/releases",
    alias: "createRelease",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ from_release_id: z.string() })
          .partial()
          .passthrough(),
      },
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
    response: Release,
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/instances/:id/releases",
    alias: "listReleases",
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
      {
        name: "state",
        type: "Query",
        schema: z
          .enum([
            "Pending",
            "InProgress",
            "Released",
            "Failed",
            "Superseded",
            "Cancelled",
          ])
          .optional(),
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
    response: ReleaseList,
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/instances/:id/releases/:release_id",
    alias: "getRelease",
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
      {
        name: "release_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ReleaseDetail,
  },
  {
    method: "post",
    path: "/api/v1/organizations/:org_id/instances/:id/releases/:release_id/cancel",
    alias: "cancelRelease",
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
      {
        name: "release_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.void(),
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/instances/:id/releases/:release_id/events",
    alias: "listReleaseEvents",
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
      {
        name: "release_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "after_sequence",
        type: "Query",
        schema: z.number().int().optional().default(0),
      },
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().lte(500).optional().default(100),
      },
    ],
    response: ReleaseEventList,
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/instances/:id/releases/:release_id/events/stream",
    alias: "streamReleaseEvents",
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
      {
        name: "release_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "after_sequence",
        type: "Query",
        schema: z.number().int().optional().default(0),
      },
    ],
    response: z.void(),
  },
  {
    method: "get",
    path: "/api/v1/organizations/:org_id/instances/:id/resources",
    alias: "getApiv1organizationsOrg_idinstancesIdresources",
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
    response: ApplicationInstanceResourceList,
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
    path: "/api/v1/organizations/:org_id/instances/:id/resources",
    alias: "createApplicationInstanceResource",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ApplicationInstanceResource,
      },
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
    response: ApplicationInstanceResource,
    errors: [
      {
        status: 400,
        description: `Invalid request data. &#x60;details&#x60; carries a &#x60;ValidationErrorDetail&#x60; payload when the failure is an aggregated field validation error.`,
        schema: Error,
      },
      {
        status: 401,
        description: `Unauthorized`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `ApplicationInstance not found`,
        schema: z.void(),
      },
      {
        status: 409,
        description: `ApplicationInstance resource already exists`,
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
    path: "/api/v1/organizations/:org_id/instances/:id/resources/:resource_name",
    alias: "getApiv1organizationsOrg_idinstancesIdresourcesResource_name",
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
      {
        name: "resource_name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ApplicationInstanceResource,
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
    method: "put",
    path: "/api/v1/organizations/:org_id/instances/:id/resources/:resource_name",
    alias: "updateApplicationInstanceResource",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ApplicationInstanceResource,
      },
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
      {
        name: "resource_name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ApplicationInstanceResource,
    errors: [
      {
        status: 400,
        description: `Invalid request data. &#x60;details&#x60; carries a &#x60;ValidationErrorDetail&#x60; payload when the failure is an aggregated field validation error.`,
        schema: Error,
      },
      {
        status: 401,
        description: `Unauthorized`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `ApplicationInstance or resource not found`,
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
    method: "delete",
    path: "/api/v1/organizations/:org_id/instances/:id/resources/:resource_name",
    alias: "deleteApplicationInstanceResource",
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
      {
        name: "resource_name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `Unauthorized`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `ApplicationInstance or resource not found`,
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
    path: "/api/v1/organizations/:org_id/instances/:id/resources/:resource_name/actions/restart",
    alias:
      "postApiv1organizationsOrg_idinstancesIdresourcesResource_nameactionsrestart",
    description: `Triggers a rolling restart of the instance resource by setting a new restart request timestamp.`,
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
      {
        name: "resource_name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ApplicationInstanceResource,
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
        status: 404,
        description: `ApplicationInstance resource not found`,
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
    path: "/api/v1/organizations/:org_id/instances/:id/resources/:resource_name/builds",
    alias: "getApiv1organizationsOrg_idinstancesIdresourcesResource_namebuilds",
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
      {
        name: "resource_name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ImageBuildList,
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
    method: "get",
    path: "/api/v1/organizations/:org_id/instances/:id/resources/:resource_name/logs",
    alias: "getApiv1organizationsOrg_idinstancesIdresourcesResource_namelogs",
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
      {
        name: "resource_name",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "follow",
        type: "Query",
        schema: z.boolean().optional().default(false),
      },
      {
        name: "tail",
        type: "Query",
        schema: z.number().int().optional().default(100),
      },
      {
        name: "since",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: z.void(),
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
    method: "get",
    path: "/api/v1/organizations/:org_id/instances/:id/resources/:resource_name/metrics",
    alias:
      "getApiv1organizationsOrg_idinstancesIdresourcesResource_namemetrics",
    description: `Returns metrics for a instance resource. If &#x60;stream&#x3D;true&#x60; is passed, the server responds using Server-Sent Events (SSE).
`,
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
      {
        name: "resource_name",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "stream",
        type: "Query",
        schema: z.boolean().optional().default(false),
      },
    ],
    response: ResourceMetrics,
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
    method: "get",
    path: "/api/v1/organizations/:org_id/instances/:id/topology",
    alias: "getApiv1organizationsOrg_idinstancesIdtopology",
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
    response: ApplicationInstanceTopology,
    errors: [
      {
        status: 401,
        description: `Unauthorized`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `ApplicationInstance not found`,
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
    method: "put",
    path: "/api/v1/organizations/:org_id/instances/apply",
    alias: "applyApplicationInstanceByName",
    description: `Name-addressed declarative whole-document apply. ApplicationInstance identity is the
&#x60;name&#x60; in the request body (unique per org). If a instance with that name
exists it is reconciled exactly like the id-addressed apply
(resources and connections not present in the body are deleted, volumes
are add-only); otherwise the instance and its children are created
atomically after full validation. Idempotent: clients need not know
whether the instance already exists.
`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ApplicationInstance,
      },
      {
        name: "org_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ApplicationInstance,
    errors: [
      {
        status: 400,
        description: `Invalid request data. &#x60;details&#x60; carries a &#x60;ValidationErrorDetail&#x60; payload when the failure is an aggregated field validation error.`,
        schema: Error,
      },
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
        schema: z.object({ body: z.string().min(1).regex(/\S/) }).passthrough(),
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
  {
    method: "post",
    path: "/api/v1/webhooks/github",
    alias: "postApiv1webhooksgithub",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().passthrough(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 403,
        description: `Signature verification failed`,
        schema: z.void(),
      },
      {
        status: 500,
        description: `Internal server error`,
        schema: z.void(),
      },
    ],
  },
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
