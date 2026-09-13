import type { ReleaseStatus } from '@stackbox/contract'
import type {
  AgentEvent,
  ConnectionRef,
  EnvironmentStatus,
  InstanceRef,
  PullRequestSummary,
  ReleaseRef,
  RepoRef,
  RepoSummary,
  RunRef,
  SandboxRef,
  ServiceSpec,
  SessionView,
  StartedRun,
  StartRunSpec,
  TurnStatus,
} from './types'

export interface SandboxProvider {
  // openai: GET /v1/agents/environments/{environment_id}
  status(ref: SandboxRef): Promise<EnvironmentStatus>
  // openai: codex exec-server --remote <remoteUrl> --environment-id <id>; self_hosted only, the hosted adapter is a no-op
  connect(ref: SandboxRef, remote: { remoteUrl: string }): Promise<void>
  // openai: live file download, path unverified
  readFile(ref: SandboxRef, path: string): Promise<Buffer>
  // openai: live file upload, path unverified
  writeFile(ref: SandboxRef, path: string, data: Buffer): Promise<void>
  // No openai equivalent: self_hosted compute teardown. No-op when already destroyed.
  destroy(ref: SandboxRef): Promise<void>
}

export interface AgentRuntime {
  // openai: POST /v1/agents/sessions
  startRun(spec: StartRunSpec): Promise<StartedRun>
  // openai: session event stream with stream=true; streams do not replay
  events(sessionId: string): AsyncIterable<AgentEvent>
  // openai: GET /v1/agents/sessions/{id}/items?order=asc&limit&after
  items(sessionId: string, opts?: { after?: string; limit?: number }): Promise<AgentEvent[]>
  // openai: POST /v1/agents/sessions/{id}/events, function result with turn_id and call_id
  submitFunctionResult(run: RunRef, callId: string, output: unknown): Promise<void>
  // openai: POST /v1/agents/sessions/{id}/events type agent.session.input.message; steers an active turn
  sendMessage(sessionId: string, text: string): Promise<void>
  // openai: POST /v1/agents/sessions/{id}/events type agent.session.input.cancel. No-op when nothing is running.
  cancel(sessionId: string): Promise<void>
  // openai: GET /v1/agents/sessions/{id}
  getSession(sessionId: string): Promise<SessionView>
  // openai: fetch items and turns, path unverified
  turnStatus(run: RunRef): Promise<TurnStatus>
  // openai: DELETE /v1/agents/sessions/{id}; 409 is retried inside the adapter. No-op when already deleted.
  deleteSession(sessionId: string): Promise<void>
}

export interface DeployTarget {
  createInstance(spec: { applicationId: string; services: ServiceSpec[]; variables: Record<string, string> }): Promise<InstanceRef>
  deployRelease(ref: InstanceRef, spec: { commitSha: string; ref?: string; variables: Record<string, string> }): Promise<ReleaseRef>
  releaseStatus(ref: ReleaseRef): Promise<{ status: ReleaseStatus; logUrl?: string }>
  instanceUrl(ref: InstanceRef): Promise<string>
  // No-op when already torn down.
  teardown(ref: InstanceRef): Promise<void>
}

export interface GitProvider {
  listRepositories(conn: ConnectionRef): Promise<RepoSummary[]>
  listBranches(conn: ConnectionRef, repo: RepoRef): Promise<string[]>
  headSha(conn: ConnectionRef, repo: RepoRef, branch: string): Promise<string>
  readFile(conn: ConnectionRef, repo: RepoRef, ref: string, path: string): Promise<Buffer | null>
  // Applies a format-patch series on baseRef and pushes headRef.
  pushPatch(conn: ConnectionRef, repo: RepoRef, spec: { baseRef: string; headRef: string; patch: Buffer }): Promise<{ sha: string }>
  openPullRequest(
    conn: ConnectionRef,
    repo: RepoRef,
    spec: { headRef: string; baseRef: string; title: string; body: string; draft: boolean },
  ): Promise<PullRequestSummary>
  getPullRequest(conn: ConnectionRef, repo: RepoRef, number: number): Promise<PullRequestSummary>
}

export interface Clock {
  now(): Date
}
