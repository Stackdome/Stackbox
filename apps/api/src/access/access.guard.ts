import { type CanActivate, type ExecutionContext, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { z } from 'zod'
import { ApplicationStore, TaskStore } from '../db'
import { AccessService } from './access.service'
import { fillResource } from './calc/resource'
import { ApplicationSource, PERMISSION, type Permission } from './require-permission.decorator'
import type { AuthUser } from './types'

const uuid = z.string().uuid()
const applicationBody = z.object({ application_id: uuid })

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AccessService) private readonly access: AccessService,
    @Inject(TaskStore) private readonly tasks: TaskStore,
    @Inject(ApplicationStore) private readonly applications: ApplicationStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.get<Permission | undefined>(PERMISSION, context.getHandler())
    if (!permission) {
      return true
    }
    const request = context.switchToHttp().getRequest<{ user: AuthUser; params: Record<string, string>; body: unknown }>()
    const params = { ...request.params }
    // Checked before any lookup, so another organization's ids answer 403, never 404.
    if (request.user.orgId !== params.org_id) {
      throw new ForbiddenException({ message: 'unauthorized to perform operation' })
    }
    if (permission.resource.includes(':application_id')) {
      params.application_id = await this.applicationIdFor(permission.application, params, request.body)
    }
    const allowed = await this.access.can(request.user, {
      orgId: params.org_id,
      resource: fillResource(permission.resource, params),
      action: permission.action,
    })
    if (!allowed) {
      throw new ForbiddenException({ message: 'unauthorized to perform operation' })
    }
    return true
  }

  private applicationIdFor(source: ApplicationSource, params: Record<string, string>, body: unknown): Promise<string> {
    switch (source) {
      case ApplicationSource.Body:
        return this.applicationFromBody(params.org_id, body)
      case ApplicationSource.Path:
        return this.applicationFromPath(params.org_id, params.application_id)
      case ApplicationSource.Task:
        return this.applicationOfTask(params.org_id, params.task_id)
    }
  }

  private async applicationFromPath(orgId: string, applicationId: string | undefined): Promise<string> {
    if (applicationId === undefined || !uuid.safeParse(applicationId).success || !(await this.applications.existsInOrg(orgId, applicationId))) {
      throw new NotFoundException({ message: 'application not found' })
    }
    return applicationId
  }

  private async applicationFromBody(orgId: string, body: unknown): Promise<string> {
    const parsed = applicationBody.safeParse(body)
    if (!parsed.success || !(await this.applications.existsInOrg(orgId, parsed.data.application_id))) {
      throw new NotFoundException({ code: 'unknown_application', message: 'application not found' })
    }
    return parsed.data.application_id
  }

  private async applicationOfTask(orgId: string, taskId: string | undefined): Promise<string> {
    const applicationId = taskId !== undefined && uuid.safeParse(taskId).success ? await this.tasks.applicationIdOf(orgId, taskId) : null
    if (!applicationId) {
      throw new NotFoundException({ message: 'task not found' })
    }
    return applicationId
  }
}
