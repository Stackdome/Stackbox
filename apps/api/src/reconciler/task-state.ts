import type { TaskPhase } from '@stackbox/contract'
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
  TaskMessage,
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
  // Oldest first; decide reads replies from these.
  messages: TaskMessage[]
  // By at, then id; decide reads the message_sent keys already recorded.
  events: TaskEvent[]
}

export type ExecutionPatch = Partial<Pick<Execution, 'sessionRef' | 'externalId' | 'status' | 'costCents' | 'eventCursor' | 'endedAt'>>

export interface TaskState {
  claim(lease: Lease, now: Date, limit: number): Promise<Task[]>
  // Runs ascend by number and releases by creation; decide reads the latest of each with at(-1).
  load(taskId: string): Promise<TaskSnapshot>
  // Writes only while the stored phase is still expectedPhase; otherwise throws PhaseConflict.
  saveTask(task: Task, expectedPhase: TaskPhase): Promise<void>
  // A new run whose number the task already has is not inserted.
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

export class PhaseConflict extends Error {
  constructor(taskId: string, expected: TaskPhase, actual: TaskPhase) {
    super(`task ${taskId} is ${actual}, not ${expected}`)
  }
}

export const TASK_STATE = Symbol('TaskState')
