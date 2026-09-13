import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { components } from '@stackbox/contract'
import { TaskStore } from '../db'
import { type TaskListFilter, countNeedsYou, matchesFilter, orderForList } from './calc/task-list'
import { type TaskSummary, presentTaskSummary } from './presenters/task-summary'

type TaskList = components['schemas']['TaskList']

@Injectable()
export class TaskService {
  constructor(@Inject(TaskStore) private readonly tasks: TaskStore) {}

  async list(orgId: string, filter: TaskListFilter): Promise<TaskList> {
    const rows = orderForList(await this.tasks.listRows(orgId))
    const items = rows.filter((row) => matchesFilter(row, filter)).map(presentTaskSummary)
    return { items, total: items.length, needs_you_count: countNeedsYou(rows) }
  }

  async get(orgId: string, taskId: string): Promise<TaskSummary> {
    const row = await this.tasks.getRow(orgId, taskId)
    if (!row) {
      throw new NotFoundException({ message: 'task not found' })
    }
    return presentTaskSummary(row)
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
