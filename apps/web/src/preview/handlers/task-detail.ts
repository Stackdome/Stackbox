import { ArtifactKind, CoarseStatus, MessageRole, ReportSource, TaskEventKind, TaskKind, TaskPhase, type components } from '@stackbox/contract'
import { http, HttpResponse, type HttpHandler } from 'msw'
import type { TaskDetailFixture } from '../../../.storybook/fixtures'

type Schemas = components['schemas']
type ListKey = 'events' | 'checks' | 'runs' | 'messages' | 'artifacts'

const LISTS: ListKey[] = ['events', 'checks', 'runs', 'messages', 'artifacts']
const REPORTER = 'Ada Lovelace'

function bareFixture(summary: Schemas['TaskSummary']): TaskDetailFixture {
  return {
    detail: {
      ...summary,
      report: summary.report && { ...summary.report, expected_behaviour: null, reporter: null, screenshots: [] },
      target_branch: 'main',
      budget_cents: null,
      pull_requests: [],
    },
    events: [],
    checks: [],
    runs: [],
    messages: [],
    artifacts: [],
  }
}

/** One set of handlers owns one book; a reply or a create lives only as long as it. */
export class PreviewTaskBook {
  private fixtures: TaskDetailFixture[]

  constructor(summaries: Schemas['TaskSummary'][], details: TaskDetailFixture[]) {
    this.fixtures = summaries.map((summary) => details.find((fixture) => fixture.detail.id === summary.id) ?? bareFixture(summary))
  }

  rows(): Schemas['TaskDetail'][] {
    return this.fixtures.map((fixture) => fixture.detail)
  }

  find(id: string): TaskDetailFixture | undefined {
    return this.fixtures.find((fixture) => fixture.detail.id === id)
  }

  replace(next: TaskDetailFixture): void {
    this.fixtures = this.fixtures.map((fixture) => (fixture.detail.id === next.detail.id ? next : fixture))
  }

  prepend(next: TaskDetailFixture): void {
    this.fixtures = [next, ...this.fixtures]
  }

  /** The application row is deleted; its tasks go with it, same as the cascade on the api's side. */
  removeForApplication(applicationId: string): void {
    this.fixtures = this.fixtures.filter((fixture) => fixture.detail.application.id !== applicationId)
  }

  /** Keeps every task row's embedded application name in step with a rename. */
  renameApplication(applicationId: string, name: string): void {
    this.fixtures = this.fixtures.map((fixture) =>
      fixture.detail.application.id === applicationId ? { ...fixture, detail: { ...fixture.detail, application: { ...fixture.detail.application, name } } } : fixture,
    )
  }
}

const notFound = () => HttpResponse.json({ message: 'task not found' }, { status: 404 })

function base64Of(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
}

export function taskDetailHandlers(book: PreviewTaskBook, applicationOf: (id: string) => Schemas['ApplicationSummary'] | null): HttpHandler[] {
  const uploads = new Map<string, Schemas['Artifact']>()

  return [
    http.post('*/api/v1/organizations/:orgId/artifacts', async ({ request }) => {
      const file = (await request.formData()).get('file')
      if (!(file instanceof File) || !file.type.startsWith('image/')) {
        return HttpResponse.json({ message: 'attach one image file' }, { status: 400 })
      }
      const artifact: Schemas['Artifact'] = {
        id: `artifact-${crypto.randomUUID()}`,
        kind: ArtifactKind.Screenshot,
        url: `data:${file.type};base64,${base64Of(new Uint8Array(await file.arrayBuffer()))}`,
        meta: { name: file.name },
      }
      uploads.set(artifact.id, artifact)
      return HttpResponse.json(artifact, { status: 201 })
    }),

    http.post('*/api/v1/organizations/:orgId/tasks', async ({ request }) => {
      const input = (await request.json()) as Schemas['TaskCreate']
      const application = applicationOf(input.application_id)
      if (!application) return HttpResponse.json({ message: 'application not found' }, { status: 404 })
      if (input.kind === TaskKind.Onboarding) {
        return HttpResponse.json({ code: 'unsupported_task_kind', message: 'Tasks of kind onboarding are not supported yet' }, { status: 400 })
      }
      const screenshot = input.screenshot_artifact_id ? uploads.get(input.screenshot_artifact_id) : undefined
      const detail: Schemas['TaskDetail'] = {
        id: `task-${crypto.randomUUID()}`,
        application,
        report: {
          description: input.description,
          expected_behaviour: input.expected_behaviour ?? null,
          reporter: REPORTER,
          source: ReportSource.Web,
          screenshots: screenshot ? [screenshot] : [],
        },
        kind: TaskKind.Fix,
        phase: TaskPhase.Intake,
        coarse_status: CoarseStatus.Running,
        resolution: null,
        run_number: null,
        run_limit: input.run_limit ?? 2,
        blocking_question: null,
        pull_request: null,
        instance: null,
        cost_cents: 0,
        created_at: new Date().toISOString(),
        completed_at: null,
        target_branch: input.target_branch ?? 'main',
        budget_cents: null,
        pull_requests: [],
      }
      book.prepend({ detail, events: [], checks: [], runs: [], messages: [], artifacts: screenshot ? [screenshot] : [] })
      return HttpResponse.json(detail, { status: 201 })
    }),

    http.get('*/api/v1/organizations/:orgId/tasks/:taskId', ({ params }) => {
      const fixture = book.find(String(params.taskId))
      return fixture ? HttpResponse.json(fixture.detail) : notFound()
    }),

    ...LISTS.map((key) =>
      http.get(`*/api/v1/organizations/:orgId/tasks/:taskId/${key}`, ({ params }) => {
        const fixture = book.find(String(params.taskId))
        return fixture ? HttpResponse.json({ items: fixture[key] }) : notFound()
      }),
    ),

    http.post('*/api/v1/organizations/:orgId/tasks/:taskId/messages', async ({ params, request }) => {
      const fixture = book.find(String(params.taskId))
      if (!fixture) return notFound()
      const { body } = (await request.json()) as Schemas['TaskMessageCreate']
      if (!/\S/.test(body)) return HttpResponse.json({ message: 'validation failed' }, { status: 400 })
      const now = new Date().toISOString()
      const open =
        fixture.detail.phase === TaskPhase.NeedsInput
          ? fixture.messages.filter((message) => message.blocking && message.answered_at === null).at(-1)
          : undefined
      const diversion = fixture.events.filter((event) => event.kind === TaskEventKind.PhaseChanged && event.payload.to === TaskPhase.NeedsInput).at(-1)
      const resumed = open && diversion ? (diversion.payload.from as TaskPhase) : null
      const reply: Schemas['TaskMessage'] = {
        id: `message-${crypto.randomUUID()}`,
        role: MessageRole.User,
        body,
        blocking: false,
        answered_at: null,
        replies_to_id: open?.id ?? null,
        created_at: now,
      }
      book.replace({
        ...fixture,
        detail: resumed ? { ...fixture.detail, phase: resumed, coarse_status: CoarseStatus.Running, blocking_question: null } : fixture.detail,
        messages: [...fixture.messages.map((message) => (message.id === open?.id ? { ...message, answered_at: now } : message)), reply],
        events: resumed
          ? [...fixture.events, { id: `event-${crypto.randomUUID()}`, kind: TaskEventKind.PhaseChanged, payload: { from: TaskPhase.NeedsInput, to: resumed }, at: now }]
          : fixture.events,
      })
      return HttpResponse.json(reply)
    }),
  ]
}
