import type {
  Artifact,
  Execution,
  PullRequest,
  Release,
  Run,
  Sandbox,
  Task,
  TaskCheck,
  TaskEvent,
} from '../tasks/types'
import { type Lease, isClaimable } from './calc/lease'
import type { ExecutionPatch, TaskSnapshot, TaskState } from './task-state'

type TaskContext = Pick<TaskSnapshot, 'organization' | 'repository' | 'connection' | 'report'>

function upsert<Row extends { id: string }>(rows: Row[], row: Row): Row[] {
  return rows.some((existing) => existing.id === row.id)
    ? rows.map((existing) => (existing.id === row.id ? row : existing))
    : [...rows, row]
}

export class InMemoryTaskState implements TaskState {
  private readonly tasks = new Map<string, Task>()
  private readonly contexts = new Map<string, TaskContext>()
  private runs: Run[] = []
  private releases: Release[] = []
  private sandboxes: Sandbox[] = []
  private executions: Execution[] = []
  private checks: TaskCheck[] = []
  private artifacts: Artifact[] = []
  private events: TaskEvent[] = []
  private pullRequests: PullRequest[] = []

  seed(snapshot: TaskSnapshot): void {
    const { organization, repository, connection, report, task } = snapshot
    this.tasks.set(task.id, task)
    this.contexts.set(task.id, { organization, repository, connection, report })
    this.runs = [...this.runs, ...snapshot.runs]
    this.releases = [...this.releases, ...snapshot.releases]
    this.sandboxes = [...this.sandboxes, ...snapshot.sandboxes]
    this.executions = [...this.executions, ...snapshot.executions]
    this.checks = [...this.checks, ...snapshot.checks]
    if (snapshot.pullRequest) this.pullRequests = [...this.pullRequests, snapshot.pullRequest]
  }

  eventsOf(taskId: string): TaskEvent[] {
    return this.events.filter((event) => event.taskId === taskId)
  }

  async claim(lease: Lease, now: Date, limit: number): Promise<Task[]> {
    const claimed = [...this.tasks.values()]
      .filter((task) => isClaimable(task, now))
      .slice(0, limit)
      .map((task) => ({ ...task, leaseOwner: lease.owner, leaseExpiresAt: lease.expiresAt }))
    for (const task of claimed) this.tasks.set(task.id, task)
    return claimed
  }

  async load(taskId: string): Promise<TaskSnapshot> {
    const task = this.tasks.get(taskId)
    const context = this.contexts.get(taskId)
    if (!task || !context) throw new Error(`unknown task ${taskId}`)
    return {
      ...context,
      task,
      runs: this.runs.filter((run) => run.taskId === taskId).sort((a, b) => a.number - b.number),
      releases: this.releases.filter((release) => release.instanceId === task.instanceId),
      sandboxes: this.sandboxes.filter((sandbox) => sandbox.taskId === taskId),
      executions: this.executions.filter((execution) => execution.taskId === taskId),
      checks: this.checks.filter((check) => check.taskId === taskId),
      pullRequest: this.pullRequests.find((pullRequest) => pullRequest.taskId === taskId) ?? null,
    }
  }

  async saveTask(task: Task): Promise<void> {
    this.tasks.set(task.id, task)
  }

  async saveRun(run: Run): Promise<void> {
    this.runs = upsert(this.runs, run)
  }

  async saveRelease(release: Release): Promise<void> {
    this.releases = upsert(this.releases, release)
  }

  async saveSandbox(sandbox: Sandbox): Promise<void> {
    this.sandboxes = upsert(this.sandboxes, sandbox)
  }

  async insertExecution(execution: Execution): Promise<Execution> {
    const existing = this.executions.find((stored) => stored.idempotencyKey === execution.idempotencyKey)
    if (existing) return existing
    this.executions = [...this.executions, execution]
    return execution
  }

  async updateExecution(executionId: string, patch: ExecutionPatch): Promise<void> {
    this.executions = this.executions.map((execution) => (execution.id === executionId ? { ...execution, ...patch } : execution))
  }

  async appendCheck(check: TaskCheck): Promise<void> {
    this.checks = [...this.checks, check]
  }

  async appendArtifact(artifact: Artifact): Promise<void> {
    this.artifacts = [...this.artifacts, artifact]
  }

  async appendEvent(event: TaskEvent): Promise<void> {
    this.events = [...this.events, event]
  }

  async savePullRequest(pullRequest: PullRequest): Promise<void> {
    this.pullRequests = upsert(this.pullRequests, pullRequest)
  }

  async releaseLease(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (task) this.tasks.set(taskId, { ...task, leaseOwner: null, leaseExpiresAt: null })
  }
}
