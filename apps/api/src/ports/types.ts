import type { ArtifactKind, CheckKind, CheckOutcome, MessageRole, PrState, RepoProvider } from '@stackbox/contract'

export type SandboxRef = { id: string }
export type InstanceRef = { id: string }
export type ReleaseRef = { id: string }
export type ConnectionRef = { id: string }
export type RepoRef = { id: string }
export type RunRef = { sessionId: string; turnId: string }

export const EnvironmentStatus = {
  Provisioning: 'provisioning',
  Connected: 'connected',
  Disconnected: 'disconnected',
  Failed: 'failed',
} as const
export type EnvironmentStatus = (typeof EnvironmentStatus)[keyof typeof EnvironmentStatus]

export const SessionStatus = {
  Idle: 'idle',
  InProgress: 'in_progress',
  RequiresAction: 'requires_action',
  Failed: 'failed',
} as const
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus]

export const TurnStatus = {
  InProgress: 'in_progress',
  Completed: 'completed',
  Failed: 'failed',
  Cancelled: 'cancelled',
} as const
export type TurnStatus = (typeof TurnStatus)[keyof typeof TurnStatus]

export const AgentErrorCategory = {
  Transient: 'transient',
  Permanent: 'permanent',
  Timeout: 'timeout',
  Budget: 'budget',
  Sandbox: 'sandbox',
  Cancelled: 'cancelled',
} as const
export type AgentErrorCategory = (typeof AgentErrorCategory)[keyof typeof AgentErrorCategory]

export const NetworkAccess = {
  Enabled: 'enabled',
  Disabled: 'disabled',
  Restricted: 'restricted',
} as const
export type NetworkAccess = (typeof NetworkAccess)[keyof typeof NetworkAccess]

export const EnvironmentType = {
  OpenAiHosted: 'openai_hosted',
  SelfHosted: 'self_hosted',
  None: 'none',
} as const
export type EnvironmentType = (typeof EnvironmentType)[keyof typeof EnvironmentType]

export const AgentEventKind = {
  Message: 'message',
  ToolCall: 'tool_call',
  ToolResult: 'tool_result',
  RequiresAction: 'requires_action',
  Environment: 'environment',
  Check: 'check',
  TurnCompleted: 'turn_completed',
  TurnFailed: 'turn_failed',
  TurnCancelled: 'turn_cancelled',
  SessionFailed: 'session_failed',
} as const
export type AgentEventKind = (typeof AgentEventKind)[keyof typeof AgentEventKind]

export const RequiredActionType = {
  FunctionCall: 'function_call',
  EnvironmentConnection: 'environment_connection',
} as const
export type RequiredActionType = (typeof RequiredActionType)[keyof typeof RequiredActionType]

// The agent reports checks by calling this function; the runtime maps the call to a check event.
export const REPORT_CHECK_FUNCTION = 'report_check'

export type SandboxSpec = {
  packages?: { python?: string[]; system?: string[]; npm?: string[] }
  // A nonzero exit fails environment setup.
  setupCommands: Array<{ command: string; cwd?: string }>
  files?: Array<{ path: string; data: Buffer }>
  env: Record<string, string>
  network:
    | { access: typeof NetworkAccess.Enabled | typeof NetworkAccess.Disabled }
    | { access: typeof NetworkAccess.Restricted; allowedDomains: string[] }
  templateId?: string
}

export type EnvironmentChoice =
  | ({ type: typeof EnvironmentType.OpenAiHosted } & SandboxSpec)
  | { type: typeof EnvironmentType.SelfHosted }
  | { type: typeof EnvironmentType.None }

export type RequiredAction =
  | { type: typeof RequiredActionType.FunctionCall; turnId: string; callId: string; name: string; arguments: unknown }
  | { type: typeof RequiredActionType.EnvironmentConnection; environmentId: string }

export type SessionView = {
  status: SessionStatus
  requiredActions: RequiredAction[]
  environment?: { id: string; remoteUrl?: string }
}

export type AgentEventEnvelope = { eventId: string; sessionId: string; turnId?: string; itemId?: string; at: Date }

export type CheckArtifact = { kind: ArtifactKind; url: string }

export type ReportCheckArguments = { checkKind: CheckKind; outcome: CheckOutcome; artifacts: CheckArtifact[] }

export type AgentEvent = AgentEventEnvelope &
  (
    | { kind: typeof AgentEventKind.Message; role: MessageRole.Agent; text: string }
    | { kind: typeof AgentEventKind.ToolCall; callId: string; name: string; arguments: unknown }
    | { kind: typeof AgentEventKind.ToolResult; callId: string; output: unknown }
    | { kind: typeof AgentEventKind.RequiresAction; requiredActions: RequiredAction[] }
    | { kind: typeof AgentEventKind.Environment; status: EnvironmentStatus; error?: string }
    | ({ kind: typeof AgentEventKind.Check } & ReportCheckArguments)
    | { kind: typeof AgentEventKind.TurnCompleted; summary: string; costCents: number }
    | { kind: typeof AgentEventKind.TurnFailed; category: AgentErrorCategory; message: string; costCents: number }
    | { kind: typeof AgentEventKind.TurnCancelled }
    | { kind: typeof AgentEventKind.SessionFailed; message: string }
  )

export type RunContext = { taskId: string; instanceUrl?: string; reportDescription: string; expectedBehaviour?: string }

export type StartRunSpec = { environment: EnvironmentChoice; instructions: string; context: RunContext; input: string }

export type StartedRun = RunRef & { environment?: { id: string; remoteUrl?: string } }

export type ServiceSpec = { name: string; path?: string; image?: string; port?: number }

export type RepoSummary = { id: string; provider: RepoProvider; externalId: string; fullName: string; defaultBranch: string }

export type PullRequestSummary = {
  number: number
  headRef: string | null
  baseRef: string | null
  isDraft: boolean
  state: PrState
}
