import { Controller, Get, HttpCode, Inject, Param, Post, Query, UseGuards } from '@nestjs/common'
import { type components, schemas } from '@stackbox/contract'
import { AccessGuard, Action, RequirePermission } from '../access'
import { JwtCookieGuard } from '../auth'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import type { TaskSummary } from './presenters/task-summary'
import { TaskService } from './task.service'

type TaskList = components['schemas']['TaskList']
type TaskListQuery = components['schemas']['TaskListQuery']

const TASK_RESOURCE = '/organizations/:org_id/applications/:application_id/tasks/:task_id'

@Controller('organizations/:org_id/tasks')
@UseGuards(JwtCookieGuard, AccessGuard)
export class TasksController {
  constructor(@Inject(TaskService) private readonly tasks: TaskService) {}

  @Get()
  @RequirePermission('/organizations/:org_id/tasks', Action.List)
  list(
    @Param('org_id') orgId: string,
    @Query(new ZodValidationPipe(schemas.TaskListQuery)) query: TaskListQuery,
  ): Promise<TaskList> {
    return this.tasks.list(orgId, { status: query.status, applicationId: query.application_id, q: query.q })
  }

  @Get(':task_id')
  @RequirePermission(TASK_RESOURCE, Action.Read)
  get(@Param('org_id') orgId: string, @Param('task_id') taskId: string): Promise<TaskSummary> {
    return this.tasks.get(orgId, taskId)
  }

  @Post(':task_id/cancel')
  @HttpCode(200)
  @RequirePermission(TASK_RESOURCE, Action.Write)
  cancel(@Param('org_id') orgId: string, @Param('task_id') taskId: string): Promise<TaskSummary> {
    return this.tasks.cancel(orgId, taskId)
  }
}
