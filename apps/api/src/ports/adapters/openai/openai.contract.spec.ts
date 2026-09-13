import { describe } from 'vitest'
import { describeAgentRuntimeContract } from '../../fakes/agent-runtime.contract'
import { OpenAiAgentRuntime } from './openai-agent-runtime'
import { OpenAiClient } from './openai-client'
import { OpenAiSandboxProvider } from './openai-sandbox-provider'

const apiKey = process.env.OPENAI_API_KEY

describe.skipIf(!apiKey)('the openai_hosted adapter against the live Agents API', () => {
  describeAgentRuntimeContract('the openai agent runtime', () => {
    const client = new OpenAiClient(apiKey ?? '')
    return {
      runtime: new OpenAiAgentRuntime(client, { model: process.env.OPENAI_AGENT_MODEL ?? 'gpt-5' }),
      sandboxes: new OpenAiSandboxProvider(client),
    }
  })
})
