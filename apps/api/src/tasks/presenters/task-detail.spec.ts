import { CheckKind, CheckOutcome, RunOutcome } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { aCheckRow, aRun, aTaskDetailRow, aTaskListRow } from '../test-support/builders'
import { presentRun, presentTaskDetail } from './task-detail'
import { presentTaskSummary } from './task-summary'

describe('the task detail presenter', () => {
  it('draws every summary field plus the report, target branch, budget and pull requests', () => {
    const row = aTaskDetailRow({ summary: aTaskListRow({ task: { budgetCents: 500, targetBranch: 'release' } }) })

    const detail = presentTaskDetail(row)

    expect(detail).toEqual({
      ...presentTaskSummary(row.summary),
      report: {
        description: 'The save button does nothing.',
        expected_behaviour: 'Saving stores the form.',
        reporter: 'Ada Lovelace',
        source: row.summary.report?.source,
        screenshots: [{ id: 'F1', kind: row.report?.screenshots[0].kind, url: 'data:image/png;base64,iVBORw0KGgo=', meta: {} }],
      },
      target_branch: 'release',
      budget_cents: 500,
      pull_requests: [{ number: 142, repository_full_name: 'acme/shop', state: row.pullRequests[0].state, is_draft: true, head_ref: 'stackbox/T1', base_ref: 'main' }],
    })
  })

  it('names the latest failed check of a run and leaves a passed run without one', () => {
    const failedRun = { ...aRun({ id: 'R1', number: 1, outcome: RunOutcome.Failed }), costCents: 60 }
    const passedRun = { ...aRun({ id: 'R2', number: 2, outcome: RunOutcome.Passed }), costCents: 40 }
    const checks = [
      aCheckRow({ id: 'K1', runId: 'R1', runNumber: 1, kind: CheckKind.FixVerified, outcome: CheckOutcome.Failed }),
      aCheckRow({ id: 'K2', runId: 'R2', runNumber: 2, kind: CheckKind.FixVerified, outcome: CheckOutcome.Passed }),
    ]

    expect([failedRun, passedRun].map((run) => presentRun(run, checks).failed_check?.id ?? null)).toEqual(['K1', null])
  })
})
