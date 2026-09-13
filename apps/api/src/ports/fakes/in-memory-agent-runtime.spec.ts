import { CheckKind, CheckOutcome } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { aRunSpec } from '../../tasks/test-support/builders'
import {
  AgentErrorCategory,
  type AgentEvent,
  AgentEventKind,
  EnvironmentStatus,
  type ReportCheckArguments,
  RequiredActionType,
  SessionStatus,
} from '../types'
import { environmentBecomes, reportCheckCall, turnCompleted } from './agent-script'
import { describeAgentRuntimeContract } from './agent-runtime.contract'
import { InMemoryAgentRuntime } from './in-memory-agent-runtime'
import { InMemoryClock } from './in-memory-clock'
import { InMemorySandboxProvider } from './in-memory-sandbox-provider'

function aRuntime() {
  const sandboxes = new InMemorySandboxProvider()
  const runtime = new InMemoryAgentRuntime(sandboxes, new InMemoryClock(new Date('2026-09-13T10:00:00Z')))
  return { sandboxes, runtime }
}

async function collect(events: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
  const received: AgentEvent[] = []
  for await (const event of events) received.push(event)
  return received
}

describe('the in-memory agent runtime', () => {
  it('reports connected after the environment event arrives', async () => {
    const { sandboxes, runtime } = aRuntime()
    const { sessionId } = await runtime.startRun(aRunSpec())
    runtime.emit(sessionId, environmentBecomes(EnvironmentStatus.Connected))
    const received = await collect(runtime.events(sessionId))
    const status = await sandboxes.status(runtime.environmentOf(sessionId))
    expect({ kinds: received.map((event) => event.kind), status }).toEqual({
      kinds: [AgentEventKind.Environment],
      status: EnvironmentStatus.Connected,
    })
  })

  it('turns a report_check function call into a check event and auto-resolves it', async () => {
    const { runtime } = aRuntime()
    const { sessionId } = await runtime.startRun(aRunSpec())
    runtime.emit(
      sessionId,
      reportCheckCall('call-1', { checkKind: CheckKind.ReportReproduced, outcome: CheckOutcome.Passed, artifacts: [] }),
    )
    const received = await collect(runtime.events(sessionId))
    const session = await runtime.getSession(sessionId)
    expect({ kinds: received.map((event) => event.kind), waiting: session.requiredActions }).toEqual({
      kinds: [AgentEventKind.Check, AgentEventKind.ToolResult],
      waiting: [],
    })
  })

  it('serves only the items after a given item id', async () => {
    const { runtime } = aRuntime()
    const { sessionId } = await runtime.startRun(aRunSpec())
    runtime.emit(sessionId, environmentBecomes(EnvironmentStatus.Connected))
    runtime.emit(sessionId, turnCompleted())
    const [first] = await runtime.items(sessionId)
    const rest = await runtime.items(sessionId, { after: first?.itemId })
    expect(rest.map((event) => event.kind)).toEqual([AgentEventKind.TurnCompleted])
  })

  it('keeps a function call other than report_check waiting for a result', async () => {
    const { runtime } = aRuntime()
    const { sessionId } = await runtime.startRun(aRunSpec())
    runtime.emit(sessionId, {
      kind: AgentEventKind.RequiresAction,
      requiredActions: [{ type: RequiredActionType.FunctionCall, turnId: '', callId: 'call-9', name: 'lookup_user', arguments: {} }],
    })
    expect((await runtime.getSession(sessionId)).status).toBe(SessionStatus.RequiresAction)
  })

  it('writes a queued run\'s files into the environment it starts', async () => {
    const { sandboxes, runtime } = aRuntime()
    runtime.queueRun({ files: [{ path: '/workspace/outputs/fix.patch', data: Buffer.from('patch') }], events: [] })
    const { sessionId } = await runtime.startRun(aRunSpec())
    const patch = await sandboxes.readFile(runtime.environmentOf(sessionId), '/workspace/outputs/fix.patch')
    expect(patch.toString()).toBe('patch')
  })

  it('fails the turn permanently when a report_check call carries an outcome outside the contract', async () => {
    const { runtime } = aRuntime()
    const { sessionId } = await runtime.startRun(aRunSpec())
    const invalid = { checkKind: CheckKind.FixVerified, outcome: 'probably', artifacts: [] } as unknown as ReportCheckArguments
    runtime.emit(sessionId, reportCheckCall('call-1', invalid))
    const received = await runtime.items(sessionId)
    expect(received.map((event) => (event.kind === AgentEventKind.TurnFailed ? [event.kind, event.category] : [event.kind]))).toEqual([
      [AgentEventKind.TurnFailed, AgentErrorCategory.Permanent],
    ])
  })
})

describeAgentRuntimeContract('the in-memory agent runtime', aRuntime)
