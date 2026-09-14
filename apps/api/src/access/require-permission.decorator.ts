import { SetMetadata } from '@nestjs/common'
import type { Action } from './types'

export const PERMISSION = 'permission'

export const ApplicationSource = { Task: 'task', Body: 'body' } as const
export type ApplicationSource = (typeof ApplicationSource)[keyof typeof ApplicationSource]

export type Permission = { resource: string; action: Action; application: ApplicationSource }

export const RequirePermission = (resource: string, action: Action, application: ApplicationSource = ApplicationSource.Task) =>
  SetMetadata(PERMISSION, { resource, action, application } satisfies Permission)
