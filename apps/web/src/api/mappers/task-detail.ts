import {
  ArtifactKind,
  CheckKind,
  CheckOutcome,
  MessageRole,
  PrState,
  RunOutcome,
  TaskEventKind,
  TaskPhase,
  TaskResolution,
  type components,
} from '@stackbox/contract'
import { COARSE_STATUS_LABEL, RESOLUTION_LABEL, SOURCE_LABEL, type Task, toTask } from './task'

type Schemas = components['schemas']

export type ArtifactView = { id: string; kind: ArtifactKind; label: string; url: string; isImage: boolean; logLines: string[] | null }
export type CheckView = {
  id: string
  kind: CheckKind
  line: string
  passed: boolean
  runNumber: number | null
  shortSha: string | null
  at: string
  artifacts: ArtifactView[]
}
export type RunView = {
  id: string
  number: number
  title: string
  outcome: RunOutcome
  outcomeLabel: string
  candidateSha: string | null
  verifiedSha: string | null
  costLabel: string
  startedAt: string
  endedAt: string | null
  failedCheck: CheckView | null
}
export type MessageView = { id: string; role: MessageRole; author: string; body: string; waiting: boolean; at: string }
export type TimelineEntry = { id: string; kind: TaskEventKind; title: string; failed: boolean; at: string }
export type PullRequestView = { key: string; label: string; refs: string | null; stateLabel: string; state: PrState; isDraft: boolean; href: string }
export type TaskDetailView = Task & {
  phase: TaskPhase
  divertedFrom: TaskPhase | null
  report: { description: string; expectedBehaviour: string | null; reporter: string | null; sourceLabel: string; screenshots: ArtifactView[] } | null
  createdAt: string
  completedAt: string | null
  targetBranch: string | null
  costLabel: string
  pullRequests: PullRequestView[]
  resolution: { label: string; sentence: string } | null
  instanceLabel: string
  pendingCheck: string | null
}

export const STEP_PHASES = [
  TaskPhase.Intake,
  TaskPhase.Preparing,
  TaskPhase.Reproducing,
  TaskPhase.Implementing,
  TaskPhase.Deploying,
  TaskPhase.Verifying,
  TaskPhase.HandOver,
] as const

export const STEP_LABEL: Record<TaskPhase, string> = {
  [TaskPhase.Intake]: 'Intake',
  [TaskPhase.Preparing]: 'Preparing',
  [TaskPhase.Reproducing]: 'Reproducing',
  [TaskPhase.Implementing]: 'Implementing',
  [TaskPhase.Deploying]: 'Deploying',
  [TaskPhase.Verifying]: 'Verifying',
  [TaskPhase.HandOver]: 'Hand over',
  [TaskPhase.NeedsInput]: 'Needs input',
  [TaskPhase.Failed]: 'Failed',
  [TaskPhase.Cancelled]: 'Cancelled',
}

export const NOT_STARTED_INSTANCE = 'Not started yet'

const CHECK_LABEL: Record<CheckKind, string> = {
  [CheckKind.InstanceReady]: 'Instance ready',
  [CheckKind.ReportReproduced]: 'Reproduced',
  [CheckKind.FixVerified]: 'Fix verified',
}

const OUTCOME_WORD: Record<CheckOutcome, string> = {
  [CheckOutcome.Passed]: 'passed',
  [CheckOutcome.Failed]: 'failed',
  [CheckOutcome.Inconclusive]: 'inconclusive',
}

const RUN_OUTCOME_LABEL: Record<RunOutcome, string> = {
  [RunOutcome.Running]: 'In flight',
  [RunOutcome.Passed]: 'Passed',
  [RunOutcome.Failed]: 'Failed',
  [RunOutcome.Abandoned]: 'Abandoned',
}

const AUTHOR: Record<MessageRole, string> = {
  [MessageRole.User]: 'You',
  [MessageRole.Agent]: 'Agent',
  [MessageRole.System]: 'Stackbox',
}

const ARTIFACT_LABEL: Record<ArtifactKind, string> = {
  [ArtifactKind.Screenshot]: 'Screenshot',
  [ArtifactKind.Har]: 'Network capture',
  [ArtifactKind.TestLog]: 'Test log',
  [ArtifactKind.Recording]: 'Recording',
}

const PR_STATE_LABEL: Record<PrState, string> = {
  [PrState.Open]: 'Open',
  [PrState.Merged]: 'Merged',
  [PrState.Closed]: 'Closed',
}

const RESOLUTION_SENTENCE: Record<TaskResolution, string> = {
  [TaskResolution.FixVerified]: 'A check watched the fix work on an Application Instance, and the evidence is attached.',
  [TaskResolution.FixUnverified]: 'The change is unproven: no check watched it work, so review it as untested code.',
  [TaskResolution.NotReproduced]: 'The agent could not observe the bug, so add steps or a screenshot to the report before running it again.',
  [TaskResolution.NoChangeNeeded]: 'The agent found the behaviour already correct, so there is nothing to merge.',
  [TaskResolution.Abandoned]: 'The task stopped before a fix was proven, so nothing here is ready to merge.',
}

const STOPPED_SENTENCE: Partial<Record<TaskPhase, string>> = {
  [TaskPhase.Failed]: 'The task failed before a fix was proven, so nothing here is ready to merge.',
  [TaskPhase.Cancelled]: 'The task was cancelled before a fix was proven, so nothing here is ready to merge.',
}

const PENDING_CHECK: Partial<Record<TaskPhase, CheckKind>> = {
  [TaskPhase.Preparing]: CheckKind.InstanceReady,
  [TaskPhase.Reproducing]: CheckKind.ReportReproduced,
  [TaskPhase.Verifying]: CheckKind.FixVerified,
}

const DIVERSIONS: readonly TaskPhase[] = [TaskPhase.NeedsInput, TaskPhase.Failed, TaskPhase.Cancelled]

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function shortSha(sha: string | null): string | null {
  return sha && sha.slice(0, 7)
}

function payloadValue(event: Schemas['TaskEvent'], key: string): string {
  return String(event.payload[key] ?? '')
}

// A test log arrives as a base64 data URL this slice; anything else has no lines to show.
function linesOfDataUrl(url: string): string[] {
  const [, encoded = ''] = url.split(';base64,')
  return atob(encoded).split('\n').filter((line) => line.length > 0)
}

export function toArtifact(artifact: Schemas['Artifact']): ArtifactView {
  return {
    id: artifact.id,
    kind: artifact.kind,
    label: ARTIFACT_LABEL[artifact.kind],
    url: artifact.url,
    isImage: artifact.kind === ArtifactKind.Screenshot,
    logLines: artifact.kind === ArtifactKind.TestLog ? linesOfDataUrl(artifact.url) : null,
  }
}

export function toCheck(check: Schemas['TaskCheck']): CheckView {
  return {
    id: check.id,
    kind: check.kind,
    line: `${CHECK_LABEL[check.kind]}: ${OUTCOME_WORD[check.outcome]}`,
    passed: check.outcome === CheckOutcome.Passed,
    runNumber: check.run_number,
    shortSha: shortSha(check.commit_sha),
    at: check.ran_at,
    artifacts: check.artifacts.map(toArtifact),
  }
}

export function toRun(run: Schemas['TaskRun']): RunView {
  return {
    id: run.id,
    number: run.number,
    title: `Run ${run.number}`,
    outcome: run.outcome,
    outcomeLabel: RUN_OUTCOME_LABEL[run.outcome],
    candidateSha: shortSha(run.candidate_sha),
    verifiedSha: shortSha(run.verified_sha),
    costLabel: formatCents(run.cost_cents),
    startedAt: run.started_at,
    endedAt: run.ended_at,
    failedCheck: run.failed_check ? toCheck(run.failed_check) : null,
  }
}

export function toMessage(message: Schemas['TaskMessage']): MessageView {
  return {
    id: message.id,
    role: message.role,
    author: AUTHOR[message.role],
    body: message.body,
    waiting: message.blocking && message.answered_at === null,
    at: message.created_at,
  }
}

const TIMELINE_TITLE: Record<TaskEventKind, (event: Schemas['TaskEvent']) => { title: string; failed: boolean }> = {
  [TaskEventKind.PhaseChanged]: (event) => {
    const to = payloadValue(event, 'to') as TaskPhase
    return { title: `Moved to ${STEP_LABEL[to]}`, failed: to === TaskPhase.Failed }
  },
  [TaskEventKind.InstanceRequested]: () => ({ title: 'Asked for an Application Instance', failed: false }),
  [TaskEventKind.BudgetExceeded]: () => ({ title: 'Stopped: the budget is spent', failed: true }),
  [TaskEventKind.CheckIgnored]: (event) => ({
    title: `Ignored a ${CHECK_LABEL[payloadValue(event, 'checkKind') as CheckKind]} check this run may not report`,
    failed: false,
  }),
  [TaskEventKind.RunStarted]: (event) => ({ title: `Run ${payloadValue(event, 'number')} started`, failed: false }),
  [TaskEventKind.RunEnded]: (event) => {
    const outcome = payloadValue(event, 'outcome') as RunOutcome
    return {
      title: `Run ${payloadValue(event, 'number')} ${RUN_OUTCOME_LABEL[outcome].toLowerCase()}`,
      failed: outcome === RunOutcome.Failed || outcome === RunOutcome.Abandoned,
    }
  },
  [TaskEventKind.CheckRecorded]: (event) => {
    const outcome = payloadValue(event, 'outcome') as CheckOutcome
    return { title: `${CHECK_LABEL[payloadValue(event, 'checkKind') as CheckKind]}: ${OUTCOME_WORD[outcome]}`, failed: outcome !== CheckOutcome.Passed }
  },
  [TaskEventKind.MessageSent]: () => ({ title: 'Sent your reply to the agent', failed: false }),
}

export function toTimelineEntry(event: Schemas['TaskEvent']): TimelineEntry {
  return { id: event.id, kind: event.kind, at: event.at, ...TIMELINE_TITLE[event.kind](event) }
}

function divertedFrom(phase: TaskPhase, events: Schemas['TaskEvent'][]): TaskPhase | null {
  const into = events.filter((event) => event.kind === TaskEventKind.PhaseChanged && event.payload.to === phase).at(-1)
  return into ? (payloadValue(into, 'from') as TaskPhase) : null
}

function resolutionOf(detail: Schemas['TaskDetail']): TaskDetailView['resolution'] {
  if (detail.resolution) return { label: RESOLUTION_LABEL[detail.resolution], sentence: RESOLUTION_SENTENCE[detail.resolution] }
  const stopped = STOPPED_SENTENCE[detail.phase]
  return stopped ? { label: COARSE_STATUS_LABEL[detail.coarse_status], sentence: stopped } : null
}

export function toTaskDetail(detail: Schemas['TaskDetail'], events: Schemas['TaskEvent'][]): TaskDetailView {
  const pending = PENDING_CHECK[detail.phase]
  return {
    ...toTask(detail),
    phase: detail.phase,
    divertedFrom: DIVERSIONS.includes(detail.phase) ? divertedFrom(detail.phase, events) : null,
    report: detail.report && {
      description: detail.report.description,
      expectedBehaviour: detail.report.expected_behaviour,
      reporter: detail.report.reporter,
      sourceLabel: SOURCE_LABEL[detail.report.source],
      screenshots: detail.report.screenshots.map(toArtifact),
    },
    createdAt: detail.created_at,
    completedAt: detail.completed_at,
    targetBranch: detail.target_branch,
    costLabel: formatCents(detail.cost_cents),
    pullRequests: detail.pull_requests.map((pull) => ({
      key: `${pull.repository_full_name}#${pull.number}`,
      label: `${pull.repository_full_name} #${pull.number}`,
      refs: pull.head_ref && pull.base_ref ? `${pull.head_ref} into ${pull.base_ref}` : null,
      stateLabel: pull.is_draft ? `Draft, ${PR_STATE_LABEL[pull.state].toLowerCase()}` : PR_STATE_LABEL[pull.state],
      state: pull.state,
      isDraft: pull.is_draft,
      href: `https://github.com/${pull.repository_full_name}/pull/${pull.number}`,
    })),
    resolution: resolutionOf(detail),
    instanceLabel: detail.instance?.url ?? NOT_STARTED_INSTANCE,
    pendingCheck: pending ? CHECK_LABEL[pending] : null,
  }
}
