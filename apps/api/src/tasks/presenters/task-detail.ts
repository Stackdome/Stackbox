import { CheckOutcome, type components } from '@stackbox/contract'
import type { Artifact, CheckRow, RunRow, TaskDetailRow, TaskEvent, TaskMessage } from '../types'
import { presentTaskSummary } from './task-summary'

type Schemas = components['schemas']
export type TaskDetail = Schemas['TaskDetail']
export type ArtifactView = Schemas['Artifact']
export type TaskEventView = Schemas['TaskEvent']
export type TaskCheckView = Schemas['TaskCheck']
export type TaskRunView = Schemas['TaskRun']
export type TaskMessageView = Schemas['TaskMessage']

export function presentArtifact(row: Artifact): ArtifactView {
  return { id: row.id, kind: row.kind, url: row.url, meta: row.meta }
}

export function presentTaskDetail(row: TaskDetailRow): TaskDetail {
  const { task } = row.summary
  return {
    ...presentTaskSummary(row.summary),
    report: row.report && {
      description: row.report.description,
      expected_behaviour: row.report.expectedBehaviour,
      reporter: row.report.reporter,
      source: row.report.source,
      screenshots: row.report.screenshots.map(presentArtifact),
    },
    target_branch: task.targetBranch,
    budget_cents: task.budgetCents,
    pull_requests: row.pullRequests.map((pull) => ({
      number: pull.number,
      repository_full_name: pull.repositoryFullName,
      state: pull.state,
      is_draft: pull.isDraft,
      head_ref: pull.headRef,
      base_ref: pull.baseRef,
    })),
  }
}

export function presentEvent(event: TaskEvent): TaskEventView {
  return { id: event.id, kind: event.kind, payload: event.payload, at: event.at.toISOString() }
}

export function presentCheck(check: CheckRow): TaskCheckView {
  return {
    id: check.id,
    kind: check.kind,
    outcome: check.outcome,
    run_number: check.runNumber,
    commit_sha: check.commitSha,
    ran_at: check.ranAt.toISOString(),
    artifacts: check.artifacts.map(presentArtifact),
  }
}

export function presentRun(run: RunRow, checks: readonly CheckRow[]): TaskRunView {
  const failed = checks.filter((check) => check.runId === run.id && check.outcome === CheckOutcome.Failed).at(-1)
  return {
    id: run.id,
    number: run.number,
    outcome: run.outcome,
    candidate_sha: run.candidateSha,
    verified_sha: run.verifiedSha,
    started_at: run.startedAt.toISOString(),
    ended_at: run.endedAt?.toISOString() ?? null,
    cost_cents: run.costCents,
    failed_check: failed ? presentCheck(failed) : null,
  }
}

export function presentMessage(message: TaskMessage): TaskMessageView {
  return {
    id: message.id,
    role: message.role,
    body: message.body,
    blocking: message.blocking,
    answered_at: message.answeredAt?.toISOString() ?? null,
    replies_to_id: message.repliesToId,
    created_at: message.createdAt.toISOString(),
  }
}
