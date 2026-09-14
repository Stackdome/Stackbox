import { randomUUID } from 'node:crypto'
import type { AgentRuntime, Clock } from '../ports'
import { OpenAiAgentRuntime } from '../ports/adapters/openai/openai-agent-runtime'
import { OpenAiClient } from '../ports/adapters/openai/openai-client'
import { DEMO_FIX_SCRIPT, type InMemorySandboxProvider, ScriptedAgentRuntime } from '../ports/fakes'
import { PATCH_PATH } from './calc/run-spec'
import type { ReconcilerSettings } from './settings'

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

export function settingsFrom(env: NodeJS.ProcessEnv): ReconcilerSettings {
  return {
    owner: `${process.pid}:${randomUUID()}`,
    claimLimit: 10,
    gitHost: 'github.com',
    readToken: env.GIT_READ_TOKEN ?? 'scripted-read-token',
    tickEnabled: env.RECONCILER_ENABLED !== 'false',
  }
}
