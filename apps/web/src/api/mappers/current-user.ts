import { UserRole, type components } from '@stackbox/contract'

type Schemas = components['schemas']

export type CurrentUserView = {
  id: string
  name: string
  email: string
  role: UserRole
  isOrgAdmin: boolean
  organizationId: string
  organizationName: string
}

export function toCurrentUser(user: Schemas['CurrentUser']): CurrentUserView {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isOrgAdmin: user.role === UserRole.OrgAdmin,
    organizationId: user.organization.id,
    organizationName: user.organization.name,
  }
}
