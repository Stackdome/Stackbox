import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { components } from '@stackbox/contract'
import { TaskStore } from '../db'
import { type TaskListFilter, countNeedsYou, matchesFilter, orderForList } from './calc/task-list'
import { timelineOf } from './calc/timeline'
import { type TaskDetail, presentArtifact, presentCheck, presentEvent, presentMessage, presentRun, presentTaskDetail } from './presenters/task-detail'
import { type TaskSummary, presentTaskSummary } from './presenters/task-summary'

type Schemas = components['schemas']

@Injectable()
export class TaskService {
  constructor(@Inject(TaskStore) private readonly tasks: TaskStore) {}

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
}
