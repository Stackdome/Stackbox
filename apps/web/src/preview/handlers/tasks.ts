import { CoarseStatus, TaskPhase, type components } from '@stackbox/contract'
import { http, HttpResponse, type HttpHandler } from 'msw'
import type { TaskDetailFixture } from '../../../.storybook/fixtures'
import { PreviewTaskBook, taskDetailHandlers } from './task-detail'

type TaskSummary = components['schemas']['TaskSummary']
type ApplicationSummary = components['schemas']['ApplicationSummary']

const FINISHED: CoarseStatus[] = [CoarseStatus.ReadyForReview, CoarseStatus.Failed, CoarseStatus.Cancelled]

/**
 * A fresh call starts from `seed` again; a cancel, reply or create lives only
 * as long as this set of handlers, unless a `PreviewTaskBook` is passed
 * directly (shared with a `PreviewCatalog` built on the same book).
 *
 * `applications` is either the static list a standalone story renders, or a
 * per-id lookup backed by a catalog so a task created on a catalog-created
 * application resolves.
 */
export function taskHandlers(
  seedOrBook: TaskSummary[] | PreviewTaskBook,
  applications: ApplicationSummary[] | ((id: string) => ApplicationSummary | null),
  details: TaskDetailFixture[] = [],
): HttpHandler[] {
  const book = seedOrBook instanceof PreviewTaskBook ? seedOrBook : new PreviewTaskBook(seedOrBook, details)
  const applicationOf = typeof applications === 'function' ? applications : (id: string) => applications.find((candidate) => candidate.id === id) ?? null
  // Shadowed by the catalog's own GET /applications when the two are combined; kept for standalone use.
  const list = typeof applications === 'function' ? [] : applications

  return [
    ...taskDetailHandlers(book, applicationOf),
    http.get('*/api/v1/organizations/:orgId/tasks', ({ request }) => {
      const applicationId = new URL(request.url).searchParams.get('application_id')
      const all = book.rows()
      const rows = all.filter((row) => applicationId === null || row.application.id === applicationId)
      return HttpResponse.json({
        items: rows,
        total: rows.length,
        needs_you_count: all.filter((row) => row.coarse_status === CoarseStatus.NeedsYou).length,
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
      HttpResponse.json({ items: list, total: list.length }),
    ),
  ]
}
