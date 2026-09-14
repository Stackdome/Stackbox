import { Controller, Get, HttpCode, Inject, Param, Post, Query, UseGuards } from '@nestjs/common'
import { type components, schemas } from '@stackbox/contract'
import { AccessGuard, Action, RequirePermission } from '../access'
import { JwtCookieGuard } from '../auth'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import type { TaskDetail } from './presenters/task-detail'
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
  get(@Param('org_id') orgId: string, @Param('task_id') taskId: string): Promise<TaskDetail> {
    return this.tasks.get(orgId, taskId)
  }

  @Get(':task_id/events')
  @RequirePermission(TASK_RESOURCE, Action.Read)
  events(@Param('task_id') taskId: string): Promise<components['schemas']['TaskEventList']> {
    return this.tasks.events(taskId)
  }

  @Get(':task_id/checks')
  @RequirePermission(TASK_RESOURCE, Action.Read)
  checks(@Param('task_id') taskId: string): Promise<components['schemas']['TaskCheckList']> {
    return this.tasks.checks(taskId)
  }

  @Get(':task_id/runs')
  @RequirePermission(TASK_RESOURCE, Action.Read)
  runs(@Param('task_id') taskId: string): Promise<components['schemas']['TaskRunList']> {
    return this.tasks.runs(taskId)
  }

  @Get(':task_id/messages')
  @RequirePermission(TASK_RESOURCE, Action.Read)
  messages(@Param('task_id') taskId: string): Promise<components['schemas']['TaskMessageList']> {
    return this.tasks.messages(taskId)
  }

  @Get(':task_id/artifacts')
  @RequirePermission(TASK_RESOURCE, Action.Read)
  artifacts(@Param('task_id') taskId: string): Promise<components['schemas']['ArtifactList']> {
    return this.tasks.artifacts(taskId)
  }

  @Post(':task_id/cancel')
  @HttpCode(200)
  @RequirePermission(TASK_RESOURCE, Action.Write)
  cancel(@Param('org_id') orgId: string, @Param('task_id') taskId: string): Promise<TaskSummary> {
    return this.tasks.cancel(orgId, taskId)
  }
}
