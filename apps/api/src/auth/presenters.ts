import type { components } from '@stackbox/contract'
import type { UserProfile } from '../organizations/types'
import type { ApiTokenRecord } from './types'

type Schemas = components['schemas']

export function presentCurrentUser(user: UserProfile): Schemas['CurrentUser'] {
  return {
    id: user.id,
    name: user.name ?? user.email,
    email: user.email,
    role: user.orgRole,
    organization: { id: user.orgId, name: user.organizationName },
  }
}

export function presentApiToken(record: ApiTokenRecord): Schemas['ApiToken'] {
  return {
    id: record.id,
    name: record.name,
    prefix: record.prefix,
    expires_at: record.expiresAt?.toISOString() ?? null,
    last_used_at: record.lastUsedAt?.toISOString() ?? null,
    created_at: record.createdAt.toISOString(),
  }
}
