import type {
  Artifact,
  Execution,
  GitConnection,
  Organization,
  PullRequest,
  Release,
  Report,
  Repository,
  Run,
  Sandbox,
  Task,
  TaskCheck,
  TaskEvent,
} from '../tasks/types'
import type { Lease } from './calc/lease'

export type TaskSnapshot = {
  organization: Organization
  repository: Repository
  connection: GitConnection
  report: Report
  task: Task
  runs: Run[]
  releases: Release[]
  sandboxes: Sandbox[]
  executions: Execution[]
  checks: TaskCheck[]
  pullRequest: PullRequest | null
}

export type ExecutionPatch = Partial<Pick<Execution, 'sessionRef' | 'externalId' | 'status' | 'costCents' | 'eventCursor' | 'endedAt'>>

export interface TaskState {
  claim(lease: Lease, now: Date, limit: number): Promise<Task[]>
  load(taskId: string): Promise<TaskSnapshot>
  saveTask(task: Task): Promise<void>
  saveRun(run: Run): Promise<void>
  saveRelease(release: Release): Promise<void>
  saveSandbox(sandbox: Sandbox): Promise<void>
  // Returns the stored row instead when the idempotency key already exists.
  insertExecution(execution: Execution): Promise<Execution>
  updateExecution(executionId: string, patch: ExecutionPatch): Promise<void>
  appendCheck(check: TaskCheck): Promise<void>
  appendArtifact(artifact: Artifact): Promise<void>
  appendEvent(event: TaskEvent): Promise<void>
  savePullRequest(pullRequest: PullRequest): Promise<void>
  releaseLease(taskId: string): Promise<void>
}

export const TASK_STATE = Symbol('TaskState')
