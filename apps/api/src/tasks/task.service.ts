import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ArtifactKind, TaskKind, schemas, type components } from '@stackbox/contract'
import { z } from 'zod'
import type { AuthUser } from '../access'
import { ArtifactStore, ScreenshotNotFound, TaskStore, UserStore } from '../db'
import { type TaskListFilter, countNeedsYou, matchesFilter, orderForList } from './calc/task-list'
import { timelineOf } from './calc/timeline'
import { DEFAULT_RUN_LIMIT, UNSUPPORTED_TASK_KIND } from './errors'
import {
  type ArtifactView,
  type TaskDetail,
  type TaskMessageView,
  presentArtifact,
  presentCheck,
  presentEvent,
  presentMessage,
  presentRun,
  presentTaskDetail,
} from './presenters/task-detail'
import { type TaskSummary, presentTaskSummary } from './presenters/task-summary'

type Schemas = components['schemas']

export type UploadedImage = { buffer: Buffer; mimetype: string; size: number; originalname: string }

const artifactId = z.string().uuid()

// run_limit and kind carry zod defaults, so the pre-validation shape a caller supplies leaves them optional.
type TaskCreateInput = z.input<typeof schemas.TaskCreate>

@Injectable()
export class TaskService {
  constructor(
    @Inject(TaskStore) private readonly tasks: TaskStore,
    @Inject(UserStore) private readonly users: UserStore,
    @Inject(ArtifactStore) private readonly artifactStore: ArtifactStore,
  ) {}

  async list(orgId: string, filter: TaskListFilter): Promise<Schemas['TaskList']> {
    const rows = orderForList(await this.tasks.listRows(orgId))
    const items = rows.filter((row) => matchesFilter(row, filter)).map(presentTaskSummary)
    return { items, total: items.length, needs_you_count: countNeedsYou(rows) }
  }

  async get(orgId: string, taskId: string): Promise<TaskDetail> {
    const row = await this.tasks.getDetailRow(orgId, taskId)
    if (!row) {
      throw new NotFoundException({ message: 'task not found' })
    }
    return presentTaskDetail(row)
  }

  async events(taskId: string): Promise<Schemas['TaskEventList']> {
    return { items: timelineOf(await this.tasks.eventsOf(taskId)).map(presentEvent) }
  }

  async checks(taskId: string): Promise<Schemas['TaskCheckList']> {
    return { items: (await this.tasks.checksOf(taskId)).map(presentCheck) }
  }

  async runs(taskId: string): Promise<Schemas['TaskRunList']> {
    const [runs, checks] = await Promise.all([this.tasks.runsOf(taskId), this.tasks.checksOf(taskId)])
    return { items: runs.map((run) => presentRun(run, checks)) }
  }

  async messages(taskId: string): Promise<Schemas['TaskMessageList']> {
    return { items: (await this.tasks.messagesOf(taskId)).map(presentMessage) }
  }

  async artifacts(taskId: string): Promise<Schemas['ArtifactList']> {
    return { items: (await this.tasks.artifactsOf(taskId)).map(presentArtifact) }
  }

  async cancel(orgId: string, taskId: string): Promise<TaskSummary> {
    const cancelled = await this.tasks.cancel(orgId, taskId)
    if (cancelled) {
      return presentTaskSummary(cancelled)
    }
    await this.get(orgId, taskId)
    throw new ConflictException({ message: 'task has already finished' })
  }

  async create(orgId: string, user: AuthUser, input: TaskCreateInput): Promise<TaskDetail> {
    if (input.kind === TaskKind.Onboarding) {
      throw new BadRequestException(UNSUPPORTED_TASK_KIND)
    }
    const profile = await this.users.findById(user.id)
    try {
      const taskId = await this.tasks.create({
        orgId,
        applicationId: input.application_id,
        description: input.description,
        expectedBehaviour: input.expected_behaviour ?? null,
        reporter: profile?.name ?? user.email,
        screenshotArtifactId: input.screenshot_artifact_id ?? null,
        targetBranch: input.target_branch ?? null,
        runLimit: input.run_limit ?? DEFAULT_RUN_LIMIT,
        kind: (input.kind as TaskKind | undefined) ?? TaskKind.Fix,
      })
      return this.get(orgId, taskId)
    } catch (error: unknown) {
      if (error instanceof ScreenshotNotFound) {
        throw new BadRequestException({ message: 'screenshot not found' })
      }
      throw error
    }
  }

  async reply(taskId: string, body: string): Promise<TaskMessageView> {
    return presentMessage(await this.tasks.reply(taskId, body))
  }

  async uploadScreenshot(orgId: string, file: UploadedImage | undefined): Promise<ArtifactView> {
    if (!file || !file.mimetype.startsWith('image/')) {
      throw new BadRequestException({ message: 'attach one image file' })
    }
    const stored = await this.artifactStore.createUnattached(orgId, {
      kind: ArtifactKind.Screenshot,
      url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      meta: { name: file.originalname, size: file.size, mime: file.mimetype },
    })
    return presentArtifact(stored)
  }

  async artifact(orgId: string, id: string): Promise<ArtifactView> {
    const stored = artifactId.safeParse(id).success ? await this.artifactStore.findInOrg(orgId, id) : null
    if (!stored) {
      throw new NotFoundException({ message: 'artifact not found' })
    }
    return presentArtifact(stored)
  }
}
