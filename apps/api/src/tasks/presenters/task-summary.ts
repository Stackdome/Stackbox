import type { components } from '@stackbox/contract'
import { coarseStatusOf } from '../calc/coarse-status'
import type { TaskListRow } from '../types'

export type TaskSummary = components['schemas']['TaskSummary']

function shortName(fullName: string): string {
  return fullName.slice(fullName.lastIndexOf('/') + 1)
}

export function presentTaskSummary(row: TaskListRow): TaskSummary {
  return {
    id: row.task.id,
    application: row.application,
    report: row.report,
    kind: row.task.kind,
    phase: row.task.phase,
    coarse_status: coarseStatusOf(row.task.phase),
    resolution: row.task.resolution,
    run_number: row.runNumber,
    run_limit: row.task.runLimit,
    blocking_question: row.blockingQuestion,
    pull_request: row.pullRequest && {
      number: row.pullRequest.number,
      repository_short_name: shortName(row.pullRequest.repositoryFullName),
      state: row.pullRequest.state,
      is_draft: row.pullRequest.isDraft,
    },
    instance: null,
    cost_cents: row.task.costCents,
    created_at: row.task.createdAt.toISOString(),
    completed_at: row.task.completedAt?.toISOString() ?? null,
  }
}
