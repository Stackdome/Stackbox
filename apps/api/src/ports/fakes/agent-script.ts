import { CheckKind, CheckOutcome } from '@stackbox/contract'
import {
  type AgentErrorCategory,
  type AgentEvent,
  type AgentEventEnvelope,
  AgentEventKind,
  EnvironmentStatus,
  REPORT_CHECK_FUNCTION,
  type ReportCheckArguments,
  RequiredActionType,
} from '../types'

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

export type AgentEventBody = DistributiveOmit<AgentEvent, keyof AgentEventEnvelope>

export type ScriptStep = { afterMs: number; event: AgentEventBody }

export function environmentBecomes(status: EnvironmentStatus): AgentEventBody {
  return { kind: AgentEventKind.Environment, status }
}

export function reportCheckCall(callId: string, args: ReportCheckArguments): AgentEventBody {
  return {
    kind: AgentEventKind.RequiresAction,
    // The runtime stamps the active turn id when the body is emitted.
    requiredActions: [{ type: RequiredActionType.FunctionCall, turnId: '', callId, name: REPORT_CHECK_FUNCTION, arguments: args }],
  }
}

export function turnCompleted(costCents = 0): AgentEventBody {
  return { kind: AgentEventKind.TurnCompleted, summary: 'Turn completed.', costCents }
}

export function turnFailed(category: AgentErrorCategory, costCents = 0): AgentEventBody {
  return { kind: AgentEventKind.TurnFailed, category, message: 'Turn failed.', costCents }
}

export const DEFAULT_SCRIPT: readonly ScriptStep[] = [
  { afterMs: 0, event: environmentBecomes(EnvironmentStatus.Provisioning) },
  { afterMs: 1_000, event: environmentBecomes(EnvironmentStatus.Connected) },
  {
    afterMs: 3_000,
    event: reportCheckCall('call-1', { checkKind: CheckKind.ReportReproduced, outcome: CheckOutcome.Passed, artifacts: [] }),
  },
  { afterMs: 5_000, event: turnCompleted(25) },
]
