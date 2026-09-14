import type { AgentRuntime, Clock } from '../ports'
import { INVALID_REPORT_CHECK_MESSAGE, parseReportCheckArguments } from '../report-check-arguments'
import {
  AgentErrorCategory,
  type AgentEvent,
  AgentEventKind,
  REPORT_CHECK_FUNCTION,
  type RequiredAction,
  RequiredActionType,
  type RunRef,
  type SandboxRef,
  SessionStatus,
  type SessionView,
  type StartedRun,
  type StartRunSpec,
  TurnStatus,
} from '../types'
import type { AgentEventBody } from './agent-script'
import type { InMemorySandboxProvider } from './in-memory-sandbox-provider'

export type QueuedRun = { files?: Array<{ path: string; data: Buffer }>; events: AgentEventBody[] }

type FakeSession = {
  id: string
  environment: SandboxRef
  turnId: string
  spec: StartRunSpec
  items: AgentEvent[]
  status: SessionStatus
  turnStatus: TurnStatus
  pending: RequiredAction[]
  inbox: string[]
}

export class InMemoryAgentRuntime implements AgentRuntime {
  private readonly sessions = new Map<string, FakeSession>()
  private readonly queue: QueuedRun[] = []
  private itemCount = 0
  private sessionCount = 0

  constructor(
    private readonly sandboxes: InMemorySandboxProvider,
    private readonly clock: Clock,
  ) {}

  queueRun(run: QueuedRun): void {
    this.queue.push(run)
  }

  sessionIds(): string[] {
    return [...this.sessions.keys()]
  }

  environmentOf(sessionId: string): SandboxRef {
    return this.session(sessionId).environment
  }

  specOf(sessionId: string): StartRunSpec {
    return this.session(sessionId).spec
  }

  inboxOf(sessionId: string): string[] {
    return [...this.session(sessionId).inbox]
  }

  emit(sessionId: string, body: AgentEventBody): void {
    const session = this.session(sessionId)
    switch (body.kind) {
      case AgentEventKind.RequiresAction:
        return this.requireActions(session, body.requiredActions)
      case AgentEventKind.Environment:
        this.sandboxes.setStatus(session.environment, body.status)
        break
      case AgentEventKind.TurnCompleted:
        this.endTurn(session, TurnStatus.Completed)
        break
      case AgentEventKind.TurnFailed:
        this.endTurn(session, TurnStatus.Failed)
        break
      case AgentEventKind.TurnCancelled:
        this.endTurn(session, TurnStatus.Cancelled)
        break
      case AgentEventKind.SessionFailed:
        session.status = SessionStatus.Failed
        break
    }
    this.record(session, body)
  }

  async startRun(spec: StartRunSpec): Promise<StartedRun> {
    const environment = this.sandboxes.provision()
    this.sessionCount += 1
    const session: FakeSession = {
      id: `session-${this.sessionCount}`,
      environment,
      turnId: 'turn-1',
      spec,
      items: [],
      status: SessionStatus.InProgress,
      turnStatus: TurnStatus.InProgress,
      pending: [],
      inbox: [],
    }
    this.sessions.set(session.id, session)
    const queued = this.queue.shift() ?? { events: [] }
    for (const file of queued.files ?? []) await this.sandboxes.writeFile(environment, file.path, file.data)
    for (const event of queued.events) this.emit(session.id, event)
    return { sessionId: session.id, turnId: session.turnId, environment: { id: environment.id } }
  }

  async *events(sessionId: string): AsyncIterable<AgentEvent> {
    yield* [...this.session(sessionId).items]
  }

  async items(sessionId: string, opts: { after?: string; limit?: number } = {}): Promise<AgentEvent[]> {
    const items = this.session(sessionId).items
    const start = opts.after === undefined ? 0 : items.findIndex((item) => item.itemId === opts.after) + 1
    return items.slice(start, opts.limit === undefined ? undefined : start + opts.limit)
  }

  async submitFunctionResult(run: RunRef, callId: string, output: unknown): Promise<void> {
    this.resolve(this.session(run.sessionId), callId, output)
  }

  async sendMessage(sessionId: string, text: string): Promise<void> {
    this.session(sessionId).inbox.push(text)
  }

  async cancel(sessionId: string): Promise<void> {
    if (this.session(sessionId).turnStatus !== TurnStatus.InProgress) return
    this.emit(sessionId, { kind: AgentEventKind.TurnCancelled })
  }

  async getSession(sessionId: string): Promise<SessionView> {
    const session = this.session(sessionId)
    return { status: session.status, requiredActions: [...session.pending], environment: { id: session.environment.id } }
  }

  async turnStatus(run: RunRef): Promise<TurnStatus> {
    return this.session(run.sessionId).turnStatus
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId)
  }

  private requireActions(session: FakeSession, actions: RequiredAction[]): void {
    const stamped = actions.map((action) =>
      action.type === RequiredActionType.FunctionCall ? { ...action, turnId: session.turnId } : action,
    )
    const waiting: RequiredAction[] = []
    for (const action of stamped) {
      if (action.type === RequiredActionType.FunctionCall && action.name === REPORT_CHECK_FUNCTION) {
        const args = parseReportCheckArguments(action.arguments)
        if (!args) {
          this.emit(session.id, {
            kind: AgentEventKind.TurnFailed,
            category: AgentErrorCategory.Permanent,
            message: INVALID_REPORT_CHECK_MESSAGE,
            costCents: 0,
          })
          return
        }
        this.record(session, { kind: AgentEventKind.Check, ...args })
        this.resolve(session, action.callId, { recorded: true })
      } else {
        waiting.push(action)
      }
    }
    if (waiting.length === 0) return
    session.pending.push(...waiting)
    session.status = SessionStatus.RequiresAction
    this.record(session, { kind: AgentEventKind.RequiresAction, requiredActions: waiting })
  }

  private resolve(session: FakeSession, callId: string, output: unknown): void {
    session.pending = session.pending.filter((action) => action.type !== RequiredActionType.FunctionCall || action.callId !== callId)
    if (session.pending.length === 0 && session.status === SessionStatus.RequiresAction) session.status = SessionStatus.InProgress
    this.record(session, { kind: AgentEventKind.ToolResult, callId, output })
  }

  private endTurn(session: FakeSession, status: TurnStatus): void {
    session.turnStatus = status
    session.status = SessionStatus.Idle
  }

  private record(session: FakeSession, body: AgentEventBody): void {
    this.itemCount += 1
    const id = `item-${this.itemCount}`
    const envelope = { eventId: id, itemId: id, sessionId: session.id, turnId: session.turnId, at: this.clock.now() }
    session.items.push({ ...body, ...envelope } as AgentEvent)
  }

  private session(sessionId: string): FakeSession {
    const found = this.sessions.get(sessionId)
    if (!found) throw new Error(`unknown session ${sessionId}`)
    return found
  }
}
