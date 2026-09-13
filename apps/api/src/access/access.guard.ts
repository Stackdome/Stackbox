import { type CanActivate, type ExecutionContext, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { z } from 'zod'
import { TaskStore } from '../db'
import { AccessService } from './access.service'
import { fillResource } from './calc/resource'
import { PERMISSION, type Permission } from './require-permission.decorator'
import type { AuthUser } from './types'

const uuid = z.string().uuid()

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AccessService) private readonly access: AccessService,
    @Inject(TaskStore) private readonly tasks: TaskStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.get<Permission | undefined>(PERMISSION, context.getHandler())
    if (!permission) {
      return true
    }
    const request = context.switchToHttp().getRequest<{ user: AuthUser; params: Record<string, string> }>()
    const params = { ...request.params }
    // Checked before any lookup, so another organization's task ids answer 403, never 404.
    if (request.user.orgId !== params.org_id) {
      throw new ForbiddenException({ message: 'unauthorized to perform operation' })
    }
    if (permission.resource.includes(':application_id') && params.task_id) {
      const applicationId = uuid.safeParse(params.task_id).success
        ? await this.tasks.applicationIdOf(params.org_id, params.task_id)
        : null
      if (!applicationId) {
        throw new NotFoundException({ message: 'task not found' })
      }
      params.application_id = applicationId
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
}
