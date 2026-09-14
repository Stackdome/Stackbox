import { CoarseStatus, TaskPhase, type components } from '@stackbox/contract'
import { http, HttpResponse, type HttpHandler } from 'msw'
import type { TaskDetailFixture } from '../../../.storybook/fixtures'
import { PreviewTaskBook, taskDetailHandlers } from './task-detail'

type TaskSummary = components['schemas']['TaskSummary']
type ApplicationSummary = components['schemas']['ApplicationSummary']

const FINISHED: CoarseStatus[] = [CoarseStatus.ReadyForReview, CoarseStatus.Failed, CoarseStatus.Cancelled]

/** A fresh call starts from `seed` again; a cancel, reply or create lives only as long as this set of handlers. */
export function taskHandlers(seed: TaskSummary[], applications: ApplicationSummary[], details: TaskDetailFixture[] = []): HttpHandler[] {
  const book = new PreviewTaskBook(seed, details)

  return [
    ...taskDetailHandlers(book, applications),
    http.get('*/api/v1/organizations/:orgId/tasks', () => {
      const rows = book.rows()
      return HttpResponse.json({
        items: rows,
        total: rows.length,
        needs_you_count: rows.filter((row) => row.coarse_status === CoarseStatus.NeedsYou).length,
      })
    }),
    http.post('*/api/v1/organizations/:orgId/tasks/:taskId/cancel', ({ params }) => {
      const fixture = book.find(String(params.taskId))
      if (!fixture) {
        return HttpResponse.json({ message: 'task not found' }, { status: 404 })
      }
      if (FINISHED.includes(fixture.detail.coarse_status)) {
        return HttpResponse.json({ message: 'task has already finished' }, { status: 409 })
      }
      const detail = { ...fixture.detail, phase: TaskPhase.Cancelled, coarse_status: CoarseStatus.Cancelled }
      book.replace({ ...fixture, detail })
      return HttpResponse.json(detail)
    }),
    http.get('*/api/v1/organizations/:orgId/applications', () =>
      HttpResponse.json({ items: applications, total: applications.length }),
    ),
  ]
}
