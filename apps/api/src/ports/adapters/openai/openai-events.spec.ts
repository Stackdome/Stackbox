import { ArtifactKind, CheckKind, CheckOutcome, MessageRole } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { AgentErrorCategory, AgentEventKind, EnvironmentStatus, REPORT_CHECK_FUNCTION, RequiredActionType } from '../../types'
import { toAgentEvent } from './openai-events'

const CREATED_AT = 1_789_000_000

const envelope = {
  eventId: 'evt_1',
  itemId: 'evt_1',
  sessionId: 'sess_1',
  turnId: 'turn_1',
  at: new Date(CREATED_AT * 1000),
}

function wire(type: string, fields: Record<string, unknown> = {}) {
  return { id: 'evt_1', type, created_at: CREATED_AT, turn_id: 'turn_1', ...fields }
}

describe('the openai event mapping', () => {
  it('maps a report_check function call item to a check event', () => {
    const event = toAgentEvent('sess_1', {
      id: 'item_1',
      type: 'function_call',
      turn_id: 'turn_1',
      call_id: 'call_1',
      name: REPORT_CHECK_FUNCTION,
      arguments: JSON.stringify({ checkKind: CheckKind.FixVerified, outcome: CheckOutcome.Passed, artifacts: [] }),
    })
    expect(event).toMatchObject({
      kind: AgentEventKind.Check,
      checkKind: CheckKind.FixVerified,
      outcome: CheckOutcome.Passed,
      itemId: 'item_1',
    })
  })

  it('maps a completed turn stream event to turn_completed', () => {
    expect(toAgentEvent('sess_1', { id: 'evt_1', type: 'agent.session.turn.completed', turn_id: 'turn_1' })).toMatchObject({
      kind: AgentEventKind.TurnCompleted,
      turnId: 'turn_1',
    })
  })

  it('ignores an item type the ports do not model', () => {
    expect(toAgentEvent('sess_1', { id: 'item_2', type: 'reasoning' })).toBeNull()
  })

  it('maps an assistant message item to an agent message', () => {
    expect(toAgentEvent('sess_1', wire('message', { role: 'assistant', text: 'Reproduced.' }))).toEqual({
      ...envelope,
      kind: AgentEventKind.Message,
      role: MessageRole.Agent,
      text: 'Reproduced.',
    })
  })

  it('ignores a message item the agent did not write', () => {
    expect(toAgentEvent('sess_1', wire('message', { role: 'user', text: 'Begin.' }))).toBeNull()
  })

  it('maps a function call to any other function to a tool call with parsed arguments', () => {
    const event = toAgentEvent('sess_1', wire('function_call', { call_id: 'call_1', name: 'run_tests', arguments: '{"suite":"unit"}' }))
    expect(event).toEqual({ ...envelope, kind: AgentEventKind.ToolCall, callId: 'call_1', name: 'run_tests', arguments: { suite: 'unit' } })
  })

  it('maps a function call output item to a tool result', () => {
    expect(toAgentEvent('sess_1', wire('function_call_output', { call_id: 'call_1', output: 'ok' }))).toEqual({
      ...envelope,
      kind: AgentEventKind.ToolResult,
      callId: 'call_1',
      output: 'ok',
    })
  })

  it('maps a requires_action event to its required actions with parsed arguments', () => {
    const event = toAgentEvent(
      'sess_1',
      wire('agent.session.requires_action', {
        required_actions: [
          { type: 'function_call', turn_id: 'turn_1', call_id: 'call_1', name: 'run_tests', arguments: '{}' },
          { type: 'environment_connection', environment_id: 'env_1' },
        ],
      }),
    )
    expect(event).toEqual({
      ...envelope,
      kind: AgentEventKind.RequiresAction,
      requiredActions: [
        { type: RequiredActionType.FunctionCall, turnId: 'turn_1', callId: 'call_1', name: 'run_tests', arguments: {} },
        { type: RequiredActionType.EnvironmentConnection, environmentId: 'env_1' },
      ],
    })
  })

  it('maps each environment stream event to its environment status', () => {
    const statuses = ['pending', 'connected', 'disconnected', 'failed'].map((suffix) => {
      const event = toAgentEvent('sess_1', wire(`agent.session.environment.${suffix}`))
      return event?.kind === AgentEventKind.Environment ? event.status : null
    })
    expect(statuses).toEqual([
      EnvironmentStatus.Provisioning,
      EnvironmentStatus.Connected,
      EnvironmentStatus.Disconnected,
      EnvironmentStatus.Failed,
    ])
  })

  it('carries the error message of a failed environment', () => {
    expect(toAgentEvent('sess_1', wire('agent.session.environment.failed', { error: { message: 'setup exited 1' } }))).toEqual({
      ...envelope,
      kind: AgentEventKind.Environment,
      status: EnvironmentStatus.Failed,
      error: 'setup exited 1',
    })
  })

  it('maps a completed turn to turn_completed with its summary and a cost of 0', () => {
    expect(toAgentEvent('sess_1', wire('agent.session.turn.completed', { summary: 'Done.' }))).toEqual({
      ...envelope,
      kind: AgentEventKind.TurnCompleted,
      summary: 'Done.',
      costCents: 0,
    })
  })

  it('maps a turn failed on a rate limit to a transient turn_failed', () => {
    const event = toAgentEvent('sess_1', wire('agent.session.turn.failed', { error: { code: 'rate_limit_exceeded', message: 'slow down' } }))
    expect(event).toEqual({
      ...envelope,
      kind: AgentEventKind.TurnFailed,
      category: AgentErrorCategory.Transient,
      message: 'slow down',
      costCents: 0,
    })
  })

  it('maps a turn failed on any other code to a permanent turn_failed', () => {
    const event = toAgentEvent('sess_1', wire('agent.session.turn.failed', { error: { code: 'invalid_prompt', message: 'bad' } }))
    expect(event).toEqual({
      ...envelope,
      kind: AgentEventKind.TurnFailed,
      category: AgentErrorCategory.Permanent,
      message: 'bad',
      costCents: 0,
    })
  })

  it('maps a cancelled turn to turn_cancelled', () => {
    expect(toAgentEvent('sess_1', wire('agent.session.turn.cancelled'))).toEqual({ ...envelope, kind: AgentEventKind.TurnCancelled })
  })

  it('maps a failed session to session_failed with its message', () => {
    expect(toAgentEvent('sess_1', wire('agent.session.failed', { error: { message: 'environment lost' } }))).toEqual({
      ...envelope,
      kind: AgentEventKind.SessionFailed,
      message: 'environment lost',
    })
  })

  it('maps a report_check call with artifacts to a check carrying them', () => {
    const artifacts = [{ kind: ArtifactKind.Screenshot, url: 'https://artifacts.test/fixed.png' }]
    const args = JSON.stringify({ checkKind: CheckKind.ReportReproduced, outcome: CheckOutcome.Failed, artifacts })
    expect(toAgentEvent('sess_1', wire('function_call', { call_id: 'call_1', name: REPORT_CHECK_FUNCTION, arguments: args }))).toEqual({
      ...envelope,
      kind: AgentEventKind.Check,
      checkKind: CheckKind.ReportReproduced,
      outcome: CheckOutcome.Failed,
      artifacts,
    })
  })
})
