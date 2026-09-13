import { SetMetadata } from '@nestjs/common'
import type { Action } from './types'

export const PERMISSION = 'permission'

export type Permission = { resource: string; action: Action }

export const RequirePermission = (resource: string, action: Action) =>
  SetMetadata(PERMISSION, { resource, action } satisfies Permission)
