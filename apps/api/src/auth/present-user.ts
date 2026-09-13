import type { components } from '@stackbox/contract'
import type { UserProfile } from '../organizations/types'

type User = components['schemas']['User']

export function presentUser(user: UserProfile): User {
  return {
    id: user.id,
    name: user.name ?? user.email,
    username: user.email.slice(0, user.email.indexOf('@')),
    email: user.email,
    organisation: user.organizationName,
    organisation_id: user.orgId,
    role: user.orgRole,
  }
}
