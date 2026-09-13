import type {
  ArtifactKind,
  ArtifactOwner,
  CheckKind,
  CheckOutcome,
  ConnectionStatus,
  ExecutionStatus,
  PrState,
  ReleaseStatus,
  RepoProvider,
  ReportSource,
  RunOutcome,
  SandboxStatus,
  TaskKind,
  TaskPhase,
  TaskResolution,
} from '@stackbox/contract'

export type Organization = { id: string; name: string; budgetCents: number; createdAt: Date }

export type Repository = {
  id: string
  orgId: string
  provider: RepoProvider
  externalId: string
  fullName: string
  defaultBranch: string
  createdAt: Date
}

export type GitConnection = {
  id: string
  orgId: string
  provider: RepoProvider
  installationRef: string
  accountLogin: string | null
  status: ConnectionStatus
  createdAt: Date
}

export type Report = {
  id: string
  applicationId: string
  source: ReportSource
  description: string
  expectedBehaviour: string | null
  reporter: string | null
  externalRef: string | null
  createdAt: Date
}

export type Task = {
  id: string
  applicationId: string
  reportId: string | null
  instanceId: string | null
  originReleaseId: string | null
  kind: TaskKind
  targetBranch: string | null
  phase: TaskPhase
  resolution: TaskResolution | null
  runLimit: number
  // Null means only the organization budget applies.
  budgetCents: number | null
  costCents: number
  leaseOwner: string | null
  leaseExpiresAt: Date | null
  createdAt: Date
  completedAt: Date | null
}

export type Run = {
  id: string
  taskId: string
  number: number
  candidateSha: string | null
  verifiedSha: string | null
  outcome: RunOutcome
  startedAt: Date
  endedAt: Date | null
}

export type Release = {
  id: string
  instanceId: string
  runId: string | null
  commitSha: string
  ref: string | null
  status: ReleaseStatus
  createdAt: Date
}

export type Sandbox = {
  id: string
  taskId: string
  provider: string
  externalId: string | null
  status: SandboxStatus
  createdAt: Date
  stoppedAt: Date | null
}

export type Execution = {
  id: string
  sandboxId: string
  taskId: string
  runId: string | null
  // Turn id of the agent run.
  externalId: string | null
  // Agent session id, stored before any event is read.
  sessionRef: string | null
  idempotencyKey: string
  status: ExecutionStatus
  costCents: number
  // Last agent item id already applied; items are read after it because streams do not replay.
  eventCursor: string | null
  startedAt: Date
  endedAt: Date | null
}

export type TaskCheck = {
  id: string
  taskId: string
  runId: string | null
  releaseId: string | null
  executionId: string | null
  kind: CheckKind
  outcome: CheckOutcome
  commitSha: string | null
  ranAt: Date
}

export type Artifact = {
  id: string
  ownerType: ArtifactOwner
  ownerId: string
  kind: ArtifactKind
  url: string
  meta: Record<string, unknown>
  createdAt: Date
}

export type PullRequest = {
  id: string
  taskId: string | null
  repositoryId: string
  number: number
  headRef: string | null
  baseRef: string | null
  isDraft: boolean
  state: PrState
}

export const TaskEventKind = {
  PhaseChanged: 'phase_changed',
  InstanceRequested: 'instance_requested',
  BudgetExceeded: 'budget_exceeded',
} as const
export type TaskEventKind = (typeof TaskEventKind)[keyof typeof TaskEventKind]

export type TaskEvent = { id: string; taskId: string; kind: TaskEventKind; payload: Record<string, unknown>; at: Date }
