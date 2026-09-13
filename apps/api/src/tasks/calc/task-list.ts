import { CoarseStatus } from '@stackbox/contract'
import type { TaskListRow } from '../types'
import { coarseStatusOf } from './coarse-status'

export type TaskListFilter = { status?: CoarseStatus; applicationId?: string; q?: string }

const needsYou = (row: TaskListRow) => coarseStatusOf(row.task.phase) === CoarseStatus.NeedsYou

// ponytail: sorts and filters the whole organization in memory; move into SQL when an org holds thousands of tasks.
export function orderForList(rows: TaskListRow[]): TaskListRow[] {
  return [...rows].sort(
    (a, b) => Number(needsYou(b)) - Number(needsYou(a)) || b.task.createdAt.getTime() - a.task.createdAt.getTime(),
  )
}

export function matchesFilter(row: TaskListRow, filter: TaskListFilter): boolean {
  return (
    (filter.status === undefined || coarseStatusOf(row.task.phase) === filter.status) &&
    (filter.applicationId === undefined || row.application.id === filter.applicationId) &&
    (filter.q === undefined || (row.report?.description ?? '').toLowerCase().includes(filter.q.toLowerCase()))
  )
}

export function countNeedsYou(rows: TaskListRow[]): number {
  return rows.filter(needsYou).length
}
