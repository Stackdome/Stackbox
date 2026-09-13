import { type CheckKind, type CheckOutcome, MessageRole } from '@stackbox/contract'
import {
  AgentErrorCategory,
  type AgentEvent,
  type AgentEventEnvelope,
  AgentEventKind,
  type CheckArtifact,
  EnvironmentStatus,
  REPORT_CHECK_FUNCTION,
  type RequiredAction,
  RequiredActionType,
} from '../../types'

export type WireRequiredAction =
  | { type: typeof RequiredActionType.FunctionCall; turn_id: string; call_id: string; name: string; arguments: string }
  | { type: typeof RequiredActionType.EnvironmentConnection; environment_id: string }

export type WireEvent = {
  id: string
  type: string
  created_at?: number
  turn_id?: string
  role?: string
  text?: string
  call_id?: string
  name?: string
  arguments?: string
  output?: unknown
  summary?: string
  required_actions?: WireRequiredAction[]
  error?: { code?: string; message?: string }
}

// Item types come from the Sessions page; the agent.session.* names come from the stream event list.
// The items page is not indexed, so reading turn and environment events through items is unverified.
const WIRE = {
  Message: 'message',
  FunctionCall: 'function_call',
  FunctionCallOutput: 'function_call_output',
  RequiresAction: 'agent.session.requires_action',
  EnvironmentPending: 'agent.session.environment.pending',
  EnvironmentConnected: 'agent.session.environment.connected',
  EnvironmentDisconnected: 'agent.session.environment.disconnected',
  EnvironmentFailed: 'agent.session.environment.failed',
  TurnCompleted: 'agent.session.turn.completed',
  TurnFailed: 'agent.session.turn.failed',
  TurnCancelled: 'agent.session.turn.cancelled',
  SessionFailed: 'agent.session.failed',
} as const

const ASSISTANT_ROLE = 'assistant'

// Error codes are not documented on an indexed page; rate limits and server errors are the retryable ones.
const TRANSIENT_CODES = ['rate_limit_exceeded', 'server_error']

function parseArguments(raw: string | undefined): unknown {
  return raw === undefined ? {} : JSON.parse(raw)
}

export function toRequiredAction(wire: WireRequiredAction): RequiredAction {
  return wire.type === RequiredActionType.FunctionCall
    ? { type: wire.type, turnId: wire.turn_id, callId: wire.call_id, name: wire.name, arguments: parseArguments(wire.arguments) }
    : { type: wire.type, environmentId: wire.environment_id }
}

export function toAgentEvent(sessionId: string, wire: WireEvent): AgentEvent | null {
  const envelope: AgentEventEnvelope = {
    eventId: wire.id,
    itemId: wire.id,
    sessionId,
    turnId: wire.turn_id,
    at: new Date((wire.created_at ?? 0) * 1000),
  }
  const environment = (status: EnvironmentStatus): AgentEvent => ({
    ...envelope,
    kind: AgentEventKind.Environment,
    status,
    error: wire.error?.message,
  })
  switch (wire.type) {
    case WIRE.Message:
      return wire.role === ASSISTANT_ROLE ? { ...envelope, kind: AgentEventKind.Message, role: MessageRole.Agent, text: wire.text ?? '' } : null
    case WIRE.FunctionCall: {
      const args = parseArguments(wire.arguments)
      if (wire.name !== REPORT_CHECK_FUNCTION) {
        return { ...envelope, kind: AgentEventKind.ToolCall, callId: wire.call_id ?? '', name: wire.name ?? '', arguments: args }
      }
      const check = args as { checkKind: CheckKind; outcome: CheckOutcome; artifacts?: CheckArtifact[] }
      return { ...envelope, kind: AgentEventKind.Check, checkKind: check.checkKind, outcome: check.outcome, artifacts: check.artifacts ?? [] }
    }
    case WIRE.FunctionCallOutput:
      return { ...envelope, kind: AgentEventKind.ToolResult, callId: wire.call_id ?? '', output: wire.output }
    case WIRE.RequiresAction:
      return { ...envelope, kind: AgentEventKind.RequiresAction, requiredActions: (wire.required_actions ?? []).map(toRequiredAction) }
    case WIRE.EnvironmentPending:
      return environment(EnvironmentStatus.Provisioning)
    case WIRE.EnvironmentConnected:
      return environment(EnvironmentStatus.Connected)
    case WIRE.EnvironmentDisconnected:
      return environment(EnvironmentStatus.Disconnected)
    case WIRE.EnvironmentFailed:
      return environment(EnvironmentStatus.Failed)
    // Cost is 0: per-run cost needs token usage and container rates, which no indexed page publishes.
    case WIRE.TurnCompleted:
      return { ...envelope, kind: AgentEventKind.TurnCompleted, summary: wire.summary ?? '', costCents: 0 }
    case WIRE.TurnFailed:
      return {
        ...envelope,
        kind: AgentEventKind.TurnFailed,
        category: TRANSIENT_CODES.includes(wire.error?.code ?? '') ? AgentErrorCategory.Transient : AgentErrorCategory.Permanent,
        message: wire.error?.message ?? '',
        costCents: 0,
      }
    case WIRE.TurnCancelled:
      return { ...envelope, kind: AgentEventKind.TurnCancelled }
    case WIRE.SessionFailed:
      return { ...envelope, kind: AgentEventKind.SessionFailed, message: wire.error?.message ?? '' }
    default:
      return null
  }
}
