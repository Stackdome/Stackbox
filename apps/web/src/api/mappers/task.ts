import { CoarseStatus, type PrState, ReportSource, TaskPhase, TaskResolution, type components } from '@stackbox/contract'

type TaskSummary = components['schemas']['TaskSummary']

export type Task = {
  id: string
  title: string
  application: { id: string; name: string }
  status: CoarseStatus
  statusLabel: string
  phaseLine: string | null
  runLabel: string | null
  resolutionLabel: string | null
  blockingQuestion: string | null
  pullRequest: { label: string; state: PrState; isDraft: boolean } | null
  source: ReportSource | null
  sourceLabel: string | null
  at: string
  cancellable: boolean
}

export const CHANGE_REQUEST_TITLE = 'Change request'

export const COARSE_STATUS_LABEL: Record<CoarseStatus, string> = {
  [CoarseStatus.Running]: 'Running',
  [CoarseStatus.NeedsYou]: 'Needs you',
  [CoarseStatus.ReadyForReview]: 'Ready for review',
  [CoarseStatus.Failed]: 'Failed',
  [CoarseStatus.Cancelled]: 'Cancelled',
}

const PHASE_LABEL: Record<TaskPhase, string> = {
  [TaskPhase.Intake]: 'Starting',
  [TaskPhase.Preparing]: 'Preparing',
  [TaskPhase.Reproducing]: 'Reproducing',
  [TaskPhase.Implementing]: 'Implementing',
  [TaskPhase.Deploying]: 'Deploying',
  [TaskPhase.Verifying]: 'Verifying',
  [TaskPhase.HandOver]: 'Handed over',
  [TaskPhase.NeedsInput]: 'Waiting for you',
  [TaskPhase.Failed]: 'Failed',
  [TaskPhase.Cancelled]: 'Cancelled',
}

const RESOLUTION_LABEL: Record<TaskResolution, string> = {
  [TaskResolution.FixVerified]: 'Fix verified',
  [TaskResolution.FixUnverified]: 'Fix unverified',
  [TaskResolution.NotReproduced]: 'Not reproduced',
  [TaskResolution.NoChangeNeeded]: 'No change needed',
  [TaskResolution.Abandoned]: 'Abandoned',
}

const SOURCE_LABEL: Record<ReportSource, string> = {
  [ReportSource.Web]: 'Reported on the web',
  [ReportSource.Slack]: 'Reported in Slack',
  [ReportSource.Sentry]: 'Reported by Sentry',
  [ReportSource.Jam]: 'Reported with Jam',
  [ReportSource.Harness]: 'Reported by the test harness',
}

function phaseLine(summary: TaskSummary): string {
  const label = PHASE_LABEL[summary.phase]
  return summary.run_number !== null && summary.run_number > 1
    ? `Run ${summary.run_number} of ${summary.run_limit}: ${label.toLowerCase()}`
    : label
}

export function toTask(summary: TaskSummary): Task {
  const running = summary.coarse_status === CoarseStatus.Running
  const pull = summary.pull_request
  return {
    id: summary.id,
    title: summary.report?.description ?? CHANGE_REQUEST_TITLE,
    application: { id: summary.application.id, name: summary.application.name },
    status: summary.coarse_status,
    statusLabel: COARSE_STATUS_LABEL[summary.coarse_status],
    phaseLine: running ? phaseLine(summary) : null,
    runLabel: summary.run_number === null ? null : `Run ${summary.run_number} of ${summary.run_limit}`,
    resolutionLabel: summary.resolution ? RESOLUTION_LABEL[summary.resolution] : null,
    blockingQuestion: summary.blocking_question,
    pullRequest: pull && { label: `${pull.repository_short_name} #${pull.number}`, state: pull.state, isDraft: pull.is_draft },
    source: summary.report?.source ?? null,
    sourceLabel: summary.report ? SOURCE_LABEL[summary.report.source] : null,
    at: summary.completed_at ?? summary.created_at,
    cancellable: running,
  }
}
