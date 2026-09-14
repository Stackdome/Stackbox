import { PATCH_PATH } from '../reconciler/calc/run-spec'
import { OpenAiAgentRuntime } from './adapters/openai/openai-agent-runtime'
import { OpenAiClient } from './adapters/openai/openai-client'
import { DEMO_FIX_SCRIPT, type InMemorySandboxProvider, ScriptedAgentRuntime } from './fakes'
import type { AgentRuntime, Clock } from './ports'

export const AgentRuntimeChoice = { OpenAi: 'openai', Scripted: 'scripted' } as const
export type AgentRuntimeChoice = (typeof AgentRuntimeChoice)[keyof typeof AgentRuntimeChoice]

export const DEMO_PATCH_FILE = {
  path: PATCH_PATH,
  data: Buffer.from('From 0000000 Mon Sep 17 00:00:00 2001\nSubject: [PATCH] Demo fix\n'),
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]
  if (!value) throw new Error(`${name} is required when AGENT_RUNTIME is ${AgentRuntimeChoice.OpenAi}`)
  return value
}

export function agentRuntimeFor(env: NodeJS.ProcessEnv, clock: Clock, sandboxes: InMemorySandboxProvider): AgentRuntime {
  if (env.AGENT_RUNTIME !== AgentRuntimeChoice.OpenAi) {
    return new ScriptedAgentRuntime(clock, sandboxes, DEMO_FIX_SCRIPT, [DEMO_PATCH_FILE])
  }
  return new OpenAiAgentRuntime(new OpenAiClient(required(env, 'OPENAI_API_KEY')), { model: required(env, 'OPENAI_MODEL') })
}
