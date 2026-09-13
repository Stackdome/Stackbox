import { CoarseStatus, ReportSource, TaskPhase } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { aTaskListRow } from '../test-support/builders'
import { countNeedsYou, matchesFilter, orderForList } from './task-list'

const hoursAgo = (hours: number) => new Date(Date.UTC(2026, 8, 14, 12 - hours))

describe('the tasks list', () => {
  it('puts tasks that need you first and the rest newest first', () => {
    const rows = [
      aTaskListRow({ task: { id: 'old', phase: TaskPhase.Reproducing, createdAt: hoursAgo(9) } }),
      aTaskListRow({ task: { id: 'asks', phase: TaskPhase.NeedsInput, createdAt: hoursAgo(8) } }),
      aTaskListRow({ task: { id: 'new', phase: TaskPhase.HandOver, createdAt: hoursAgo(1) } }),
    ]

    expect(orderForList(rows).map((row) => row.task.id)).toEqual(['asks', 'new', 'old'])
  })

  it('keeps only the rows of the asked coarse status', () => {
    const rows = [aTaskListRow({ task: { id: 'running', phase: TaskPhase.Deploying } }), aTaskListRow({ task: { id: 'failed', phase: TaskPhase.Failed } })]

    expect(rows.filter((row) => matchesFilter(row, { status: CoarseStatus.Running })).map((row) => row.task.id)).toEqual(['running'])
  })

  it('keeps only the rows of the asked application', () => {
    const rows = [aTaskListRow({ task: { id: 'shop' } }), aTaskListRow({ task: { id: 'billing' }, application: { id: 'A2', name: 'billing' } })]

    expect(rows.filter((row) => matchesFilter(row, { applicationId: 'A2' })).map((row) => row.task.id)).toEqual(['billing'])
  })

  it('matches the search against the report description ignoring case', () => {
    const rows = [
      aTaskListRow({ task: { id: 'safari' }, report: { description: 'Checkout fails on Safari', source: ReportSource.Web } }),
      aTaskListRow({ task: { id: 'pdf' }, report: { description: 'Invoice PDF is blank', source: ReportSource.Web } }),
    ]

    expect(rows.filter((row) => matchesFilter(row, { q: 'safari' })).map((row) => row.task.id)).toEqual(['safari'])
  })

  it('counts the rows whose coarse status is needs_you', () => {
    const rows = [
      aTaskListRow({ task: { phase: TaskPhase.NeedsInput } }),
      aTaskListRow({ task: { phase: TaskPhase.NeedsInput } }),
      aTaskListRow({ task: { phase: TaskPhase.Verifying } }),
    ]

    expect(countNeedsYou(rows)).toBe(2)
  })
})
