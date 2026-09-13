import type { AgentRuntime, Clock } from '../ports'
import type { AgentEvent, RunRef, SessionView, StartedRun, StartRunSpec, TurnStatus } from '../types'
import { DEFAULT_SCRIPT, type ScriptStep } from './agent-script'
import { InMemoryAgentRuntime } from './in-memory-agent-runtime'
import type { InMemorySandboxProvider } from './in-memory-sandbox-provider'

type Progress = { startedAt: number; surfaced: number }

export class ScriptedAgentRuntime implements AgentRuntime {
  private readonly inner: InMemoryAgentRuntime
  private readonly progress = new Map<string, Progress>()

  constructor(
    private readonly clock: Clock,
    sandboxes: InMemorySandboxProvider,
    private readonly script: readonly ScriptStep[] = DEFAULT_SCRIPT,
  ) {
    this.inner = new InMemoryAgentRuntime(sandboxes, clock)
  }

  async startRun(spec: StartRunSpec): Promise<StartedRun> {
    const run = await this.inner.startRun(spec)
    this.progress.set(run.sessionId, { startedAt: this.clock.now().getTime(), surfaced: 0 })
    this.surface(run.sessionId)
    return run
  }

  events(sessionId: string): AsyncIterable<AgentEvent> {
    this.surface(sessionId)
    return this.inner.events(sessionId)
  }

  async items(sessionId: string, opts?: { after?: string; limit?: number }): Promise<AgentEvent[]> {
    this.surface(sessionId)
    return this.inner.items(sessionId, opts)
  }

  async submitFunctionResult(run: RunRef, callId: string, output: unknown): Promise<void> {
    this.surface(run.sessionId)
    return this.inner.submitFunctionResult(run, callId, output)
  }

  async sendMessage(sessionId: string, text: string): Promise<void> {
    this.surface(sessionId)
    return this.inner.sendMessage(sessionId, text)
  }

  async cancel(sessionId: string): Promise<void> {
    this.surface(sessionId)
    return this.inner.cancel(sessionId)
  }

  async getSession(sessionId: string): Promise<SessionView> {
    this.surface(sessionId)
    return this.inner.getSession(sessionId)
  }

  async turnStatus(run: RunRef): Promise<TurnStatus> {
    this.surface(run.sessionId)
    return this.inner.turnStatus(run)
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.progress.delete(sessionId)
    return this.inner.deleteSession(sessionId)
  }

  private surface(sessionId: string): void {
    const progress = this.progress.get(sessionId)
    if (!progress) return
    const elapsed = this.clock.now().getTime() - progress.startedAt
    for (let step = this.script[progress.surfaced]; step && step.afterMs <= elapsed; step = this.script[progress.surfaced]) {
      progress.surfaced += 1
      this.inner.emit(sessionId, step.event)
    }
  }
}
