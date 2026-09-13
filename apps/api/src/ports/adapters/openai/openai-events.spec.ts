import { CheckKind, CheckOutcome } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { AgentEventKind, REPORT_CHECK_FUNCTION } from '../../types'
import { toAgentEvent } from './openai-events'

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
})
