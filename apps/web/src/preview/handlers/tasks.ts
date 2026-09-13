import { CoarseStatus, TaskPhase, type components } from '@stackbox/contract'
import { http, HttpResponse, type HttpHandler } from 'msw'

type TaskSummary = components['schemas']['TaskSummary']
type ApplicationSummary = components['schemas']['ApplicationSummary']

const FINISHED: CoarseStatus[] = [CoarseStatus.ReadyForReview, CoarseStatus.Failed, CoarseStatus.Cancelled]

/** A fresh call starts from `seed` again; a cancel lives only as long as this set of handlers. */
export function taskHandlers(seed: TaskSummary[], applications: ApplicationSummary[]): HttpHandler[] {
  let rows = seed.map((row) => ({ ...row }))

  return [
    http.get('*/api/v1/organizations/:orgId/tasks', () =>
      HttpResponse.json({
        items: rows,
        total: rows.length,
        needs_you_count: rows.filter((row) => row.coarse_status === CoarseStatus.NeedsYou).length,
      }),
    ),
    http.get('*/api/v1/organizations/:orgId/tasks/:taskId', ({ params }) => {
      const row = rows.find((candidate) => candidate.id === params.taskId)
      return row ? HttpResponse.json(row) : HttpResponse.json({ reason: 'task not found' }, { status: 404 })
    }),
    http.post('*/api/v1/organizations/:orgId/tasks/:taskId/cancel', ({ params }) => {
      const row = rows.find((candidate) => candidate.id === params.taskId)
      if (!row) {
        return HttpResponse.json({ reason: 'task not found' }, { status: 404 })
      }
      if (FINISHED.includes(row.coarse_status)) {
        return HttpResponse.json({ reason: 'task has already finished' }, { status: 409 })
      }
      const cancelled = { ...row, phase: TaskPhase.Cancelled, coarse_status: CoarseStatus.Cancelled }
      rows = rows.map((candidate) => (candidate.id === cancelled.id ? cancelled : candidate))
      return HttpResponse.json(cancelled)
    }),
    http.get('*/api/v1/organizations/:orgId/applications', () =>
      HttpResponse.json({ items: applications, total: applications.length }),
    ),
  ]
}
