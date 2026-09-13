import { ArtifactKind, CheckKind, CheckOutcome } from '@stackbox/contract'
import type { AgentRuntime } from '../../ports'
import {
  type AgentEvent,
  AgentEventKind,
  type EnvironmentChoice,
  EnvironmentType,
  NetworkAccess,
  REPORT_CHECK_FUNCTION,
  type RequiredAction,
  RequiredActionType,
  type RunRef,
  type SessionStatus,
  type SessionView,
  type StartedRun,
  type StartRunSpec,
  type TurnStatus,
} from '../../types'
import { OpenAiClient, OpenAiRequestError, unlessStatus } from './openai-client'
import { type WireEvent, type WireRequiredAction, toAgentEvent, toRequiredAction } from './openai-events'

type WireSession = {
  id: string
  status: SessionStatus
  turn_id?: string
  environment?: { id: string; remote_url?: string }
  required_actions?: WireRequiredAction[]
}

const DELETE_ATTEMPTS = 5
const DELETE_RETRY_MS = 1_000

const REPORT_CHECK_TOOL = {
  type: 'function',
  name: REPORT_CHECK_FUNCTION,
  description: 'Report the outcome of one check with links to its evidence.',
  parameters: {
    type: 'object',
    required: ['checkKind', 'outcome', 'artifacts'],
    properties: {
      checkKind: { type: 'string', enum: Object.values(CheckKind) },
      outcome: { type: 'string', enum: Object.values(CheckOutcome) },
      artifacts: {
        type: 'array',
        items: {
          type: 'object',
          required: ['kind', 'url'],
          properties: { kind: { type: 'string', enum: Object.values(ArtifactKind) }, url: { type: 'string' } },
        },
      },
    },
  },
}

function toWireEnvironment(choice: EnvironmentChoice): Record<string, unknown> {
  if (choice.type !== EnvironmentType.OpenAiHosted) return { type: choice.type }
  return {
    type: choice.type,
    packages: choice.packages,
    setup_commands: choice.setupCommands,
    files: choice.files?.map((file) => ({ path: file.path, data: file.data.toString('base64') })),
    env: choice.env,
    network:
      choice.network.access === NetworkAccess.Restricted
        ? { access: choice.network.access, allowed_domains: choice.network.allowedDomains }
        : { access: choice.network.access },
    environment_template_id: choice.templateId,
  }
}

export class OpenAiAgentRuntime implements AgentRuntime {
  constructor(
    private readonly client: OpenAiClient,
    private readonly options: { model: string },
  ) {}

  async startRun(spec: StartRunSpec): Promise<StartedRun> {
    const session = await this.client.json<WireSession>('POST', '/v1/agents/sessions', {
      agent: { model: this.options.model, instructions: spec.instructions, tools: [REPORT_CHECK_TOOL] },
      environment: toWireEnvironment(spec.environment),
      input: `${spec.input}\n\nRun context: ${JSON.stringify(spec.context)}`,
    })
    return {
      sessionId: session.id,
      // The create response may omit the turn id; it then arrives on the first turn event.
      turnId: session.turn_id ?? '',
      environment: session.environment && { id: session.environment.id, remoteUrl: session.environment.remote_url },
    }
  }

  async *events(sessionId: string): AsyncIterable<AgentEvent> {
    // Streams do not replay; the reconciler reads items after its cursor and uses this only for live views.
    for await (const wire of this.client.eventStream(`/v1/agents/sessions/${sessionId}/events?stream=true`)) {
      const event = toAgentEvent(sessionId, wire as WireEvent)
      if (!event) continue
      if (event.kind === AgentEventKind.RequiresAction) await this.resolveReportChecks(sessionId, event.requiredActions)
      yield event
    }
  }

  async items(sessionId: string, opts: { after?: string; limit?: number } = {}): Promise<AgentEvent[]> {
    await this.resolveReportChecks(sessionId, (await this.getSession(sessionId)).requiredActions)
    const query = new URLSearchParams({ order: 'asc', limit: String(opts.limit ?? 100), ...(opts.after ? { after: opts.after } : {}) })
    const page = await this.client.json<{ data: WireEvent[] }>('GET', `/v1/agents/sessions/${sessionId}/items?${query}`)
    return page.data.flatMap((wire) => toAgentEvent(sessionId, wire) ?? [])
  }

  async submitFunctionResult(run: RunRef, callId: string, output: unknown): Promise<void> {
    // The function result event type name is on the unindexed Function tools page.
    await this.client.json('POST', `/v1/agents/sessions/${run.sessionId}/events`, {
      events: [{ type: 'agent.session.input.function_call_output', turn_id: run.turnId, call_id: callId, output: JSON.stringify(output) }],
    })
  }

  async sendMessage(sessionId: string, text: string): Promise<void> {
    await this.client.json('POST', `/v1/agents/sessions/${sessionId}/events`, {
      events: [{ type: 'agent.session.input.message', input: [{ role: 'user', content: text }] }],
    })
  }

  async cancel(sessionId: string): Promise<void> {
    const request = this.client.json('POST', `/v1/agents/sessions/${sessionId}/events`, {
      events: [{ type: 'agent.session.input.cancel' }],
    })
    await unlessStatus([404, 409], request, {})
  }

  async getSession(sessionId: string): Promise<SessionView> {
    const session = await this.client.json<WireSession>('GET', `/v1/agents/sessions/${sessionId}`)
    return {
      status: session.status,
      requiredActions: (session.required_actions ?? []).map(toRequiredAction),
      environment: session.environment && { id: session.environment.id, remoteUrl: session.environment.remote_url },
    }
  }

  async turnStatus(run: RunRef): Promise<TurnStatus> {
    // Turn fetch lives on the unindexed Events and Items page; path as the design reference names it.
    const turn = await this.client.json<{ status: TurnStatus }>('GET', `/v1/agents/sessions/${run.sessionId}/turns/${run.turnId}`)
    return turn.status
  }

  async deleteSession(sessionId: string): Promise<void> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        await this.client.send('DELETE', `/v1/agents/sessions/${sessionId}`)
        return
      } catch (error: unknown) {
        if (error instanceof OpenAiRequestError && error.status === 404) return
        // 409 means the environment is still setting up; the delete goes through once setup settles.
        if (!(error instanceof OpenAiRequestError && error.status === 409) || attempt === DELETE_ATTEMPTS) throw error
        await new Promise((resolve) => setTimeout(resolve, DELETE_RETRY_MS))
      }
    }
  }

  private async resolveReportChecks(sessionId: string, requiredActions: RequiredAction[]): Promise<void> {
    for (const action of requiredActions) {
      if (action.type === RequiredActionType.FunctionCall && action.name === REPORT_CHECK_FUNCTION) {
        await this.submitFunctionResult({ sessionId, turnId: action.turnId }, action.callId, { recorded: true })
      }
    }
  }
}
