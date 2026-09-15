import type { components } from '@stackbox/contract'
import type { UserProfile } from '../organizations/types'

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
