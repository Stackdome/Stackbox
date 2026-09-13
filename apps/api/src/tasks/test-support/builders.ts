import {
  CheckKind,
  CheckOutcome,
  ConnectionStatus,
  ExecutionStatus,
  ReleaseStatus,
  RepoProvider,
  ReportSource,
  RunOutcome,
  SandboxStatus,
  TaskKind,
  TaskPhase,
} from '@stackbox/contract'
import { EnvironmentType, NetworkAccess, type StartRunSpec } from '../../ports'
import type { TaskSnapshot } from '../../reconciler/task-state'
import type {
  Execution,
  GitConnection,
  Organization,
  Release,
  Report,
  Repository,
  Run,
  Sandbox,
  Task,
  TaskCheck,
} from '../types'

const AT = new Date('2026-09-13T10:00:00Z')

export function anOrganization(overrides: Partial<Organization> = {}): Organization {
  return { id: 'O1', name: 'Acme', budgetCents: 10_000, createdAt: AT, ...overrides }
}

export function aRepository(overrides: Partial<Repository> = {}): Repository {
  return {
    id: 'R1',
    orgId: 'O1',
    provider: RepoProvider.Github,
    externalId: '1001',
    fullName: 'acme/shop',
    defaultBranch: 'main',
    createdAt: AT,
    ...overrides,
  }
}

export function aGitConnection(overrides: Partial<GitConnection> = {}): GitConnection {
  return {
    id: 'C1',
    orgId: 'O1',
    provider: RepoProvider.Github,
    installationRef: 'install-1',
    accountLogin: 'acme',
    status: ConnectionStatus.Verified,
    createdAt: AT,
    ...overrides,
  }
}

export function aReport(overrides: Partial<Report> = {}): Report {
  return {
    id: 'P1',
    applicationId: 'A1',
    source: ReportSource.Web,
    description: 'The save button does nothing.',
    expectedBehaviour: 'Saving stores the form.',
    reporter: null,
    externalRef: null,
    createdAt: AT,
    ...overrides,
  }
}

export function aTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'T1',
    applicationId: 'A1',
    reportId: 'P1',
    instanceId: null,
    originReleaseId: null,
    kind: TaskKind.Fix,
    targetBranch: 'main',
    phase: TaskPhase.Intake,
    resolution: null,
    runLimit: 2,
    budgetCents: null,
    costCents: 0,
    leaseOwner: null,
    leaseExpiresAt: null,
    createdAt: AT,
    completedAt: null,
    ...overrides,
  }
}

export function aRun(overrides: Partial<Run> = {}): Run {
  return {
    id: 'T1-run1',
    taskId: 'T1',
    number: 1,
    candidateSha: null,
    verifiedSha: null,
    outcome: RunOutcome.Running,
    startedAt: AT,
    endedAt: null,
    ...overrides,
  }
}

export function aRelease(overrides: Partial<Release> = {}): Release {
  return {
    id: 'release-1',
    instanceId: 'instance-1',
    runId: null,
    commitSha: 'origin-sha',
    ref: null,
    status: ReleaseStatus.Queued,
    createdAt: AT,
    ...overrides,
  }
}

export function aSandbox(overrides: Partial<Sandbox> = {}): Sandbox {
  return {
    id: 'S1',
    taskId: 'T1',
    provider: EnvironmentType.OpenAiHosted,
    externalId: 'env-1',
    status: SandboxStatus.Running,
    createdAt: AT,
    stoppedAt: null,
    ...overrides,
  }
}

export function anExecution(overrides: Partial<Execution> = {}): Execution {
  return {
    id: 'E1',
    sandboxId: 'S1',
    taskId: 'T1',
    runId: null,
    externalId: 'turn-1',
    sessionRef: 'session-1',
    idempotencyKey: 'T1:repro',
    status: ExecutionStatus.Running,
    costCents: 0,
    eventCursor: null,
    startedAt: AT,
    endedAt: null,
    ...overrides,
  }
}

export function aCheck(overrides: Partial<TaskCheck> = {}): TaskCheck {
  return {
    id: 'K1',
    taskId: 'T1',
    runId: null,
    releaseId: 'release-1',
    executionId: null,
    itemId: null,
    kind: CheckKind.InstanceReady,
    outcome: CheckOutcome.Passed,
    commitSha: 'origin-sha',
    ranAt: AT,
    ...overrides,
  }
}

export function aSnapshot(overrides: Partial<TaskSnapshot> = {}): TaskSnapshot {
  return {
    organization: anOrganization(),
    repository: aRepository(),
    connection: aGitConnection(),
    report: aReport(),
    task: aTask(),
    runs: [],
    releases: [],
    sandboxes: [],
    executions: [],
    checks: [],
    pullRequest: null,
    ...overrides,
  }
}

export function aRunSpec(overrides: Partial<StartRunSpec> = {}): StartRunSpec {
  return {
    environment: {
      type: EnvironmentType.OpenAiHosted,
      setupCommands: [],
      env: {},
      network: { access: NetworkAccess.Disabled },
    },
    instructions: 'Reproduce the report.',
    context: { taskId: 'T1', reportDescription: 'The save button does nothing.' },
    input: 'Begin.',
    ...overrides,
  }
}
