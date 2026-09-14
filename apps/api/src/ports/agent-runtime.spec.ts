import { describe, expect, it } from 'vitest'
import { OpenAiAgentRuntime } from './adapters/openai/openai-agent-runtime'
import { AgentRuntimeChoice, agentRuntimeFor } from './agent-runtime'
import { ScriptedAgentRuntime, ScriptedClock, ScriptedSandboxProvider } from './fakes'

describe('agentRuntimeFor', () => {
  it('binds the scripted runtime unless AGENT_RUNTIME names the adapter', () => {
    const clock = new ScriptedClock()

    expect(agentRuntimeFor({}, clock, new ScriptedSandboxProvider(clock))).toBeInstanceOf(ScriptedAgentRuntime)
  })

  it('binds the adapter when AGENT_RUNTIME names it', () => {
    const clock = new ScriptedClock()
    const env = { AGENT_RUNTIME: AgentRuntimeChoice.OpenAi, OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'test-model' }

    expect(agentRuntimeFor(env, clock, new ScriptedSandboxProvider(clock))).toBeInstanceOf(OpenAiAgentRuntime)
  })
})
