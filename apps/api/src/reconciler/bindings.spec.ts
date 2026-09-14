import { describe, expect, it } from 'vitest'
import { OpenAiAgentRuntime } from '../ports/adapters/openai/openai-agent-runtime'
import { ScriptedAgentRuntime, ScriptedClock, ScriptedSandboxProvider } from '../ports/fakes'
import { AgentRuntimeChoice, agentRuntimeFor, settingsFrom } from './bindings'

describe('the reconciler bindings', () => {
  it('binds the scripted runtime unless AGENT_RUNTIME names the adapter', () => {
    const clock = new ScriptedClock()

    expect(agentRuntimeFor({}, clock, new ScriptedSandboxProvider(clock))).toBeInstanceOf(ScriptedAgentRuntime)
  })

  it('binds the adapter when AGENT_RUNTIME names it', () => {
    const clock = new ScriptedClock()
    const env = { AGENT_RUNTIME: AgentRuntimeChoice.OpenAi, OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'test-model' }

    expect(agentRuntimeFor(env, clock, new ScriptedSandboxProvider(clock))).toBeInstanceOf(OpenAiAgentRuntime)
  })

  it('ticks unless RECONCILER_ENABLED is false', () => {
    expect([settingsFrom({}).tickEnabled, settingsFrom({ RECONCILER_ENABLED: 'true' }).tickEnabled, settingsFrom({ RECONCILER_ENABLED: 'false' }).tickEnabled]).toEqual([
      true,
      true,
      false,
    ])
  })
})
