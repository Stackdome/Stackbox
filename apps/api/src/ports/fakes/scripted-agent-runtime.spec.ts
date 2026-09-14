import { describe, expect, it } from 'vitest'
import { aRunSpec } from '../../tasks/test-support/builders'
import { AgentEventKind } from '../types'
import { describeAgentRuntimeContract } from './agent-runtime.contract'
import { InMemoryClock } from './in-memory-clock'
import { InMemorySandboxProvider } from './in-memory-sandbox-provider'
import { ScriptedAgentRuntime } from './scripted-agent-runtime'
import { ScriptedClock } from './scripted-clock'
import { ScriptedSandboxProvider } from './scripted-sandbox-provider'

function aScriptedRuntime() {
  const clock = new InMemoryClock(new Date('2026-09-13T10:00:00Z'))
  const sandboxes = new ScriptedSandboxProvider(clock)
  const runtime = new ScriptedAgentRuntime(clock, sandboxes)
  return { clock, runtime, sandboxes }
}

describe('the scripted agent runtime', () => {
  it('walks environment provisioning, connected, a report_check call and turn_completed as the clock advances', async () => {
    const { clock, runtime } = aScriptedRuntime()
    const { sessionId } = await runtime.startRun(aRunSpec())
    clock.advance(5_000)
    const kinds = (await runtime.items(sessionId)).map((event) => event.kind)
    expect(kinds).toEqual([
      AgentEventKind.Environment,
      AgentEventKind.Environment,
      AgentEventKind.Check,
      AgentEventKind.ToolResult,
      AgentEventKind.TurnCompleted,
    ])
  })

  it('surfaces nothing past provisioning before the connect offset elapses', async () => {
    const { clock, runtime } = aScriptedRuntime()
    const { sessionId } = await runtime.startRun(aRunSpec())
    clock.advance(999)
    expect(await runtime.items(sessionId)).toHaveLength(1)
  })

  it('surfaces each step once however often the session is read', async () => {
    const { clock, runtime } = aScriptedRuntime()
    const { sessionId } = await runtime.startRun(aRunSpec())
    clock.advance(5_000)
    await runtime.getSession(sessionId)
    await runtime.items(sessionId)
    expect(await runtime.items(sessionId)).toHaveLength(5)
  })

  it('writes the configured files into every environment it starts', async () => {
    const sandboxes = new InMemorySandboxProvider()
    const runtime = new ScriptedAgentRuntime(new ScriptedClock(), sandboxes, [], [{ path: '/workspace/outputs/fix.patch', data: Buffer.from('patch') }])

    const started = await runtime.startRun(aRunSpec())

    expect((await sandboxes.readFile({ id: started.environment?.id ?? '' }, '/workspace/outputs/fix.patch')).toString()).toBe('patch')
  })
})

describeAgentRuntimeContract('the scripted agent runtime', aScriptedRuntime)
