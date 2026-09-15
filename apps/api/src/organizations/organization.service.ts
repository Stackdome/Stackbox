import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { components } from '@stackbox/contract'
import { z } from 'zod'
import type { AuthUser } from '../access/types'
import { OrganizationStore } from '../db/organization-store'
import { UserStore } from '../db/user-store'
import { MEMBER_NOT_FOUND, ORGANIZATION_NOT_FOUND, REFUSAL_ERROR } from './errors'
import { presentMember, presentOrganization } from './presenters'
import { MemberOutcomeKind } from './types'

type Schemas = components['schemas']

const uuid = z.string().uuid()

@Injectable()
export class OrganizationService {
  constructor(
    @Inject(OrganizationStore) private readonly organizations: OrganizationStore,
    @Inject(UserStore) private readonly users: UserStore,
  ) {}

  async organization(orgId: string): Promise<Schemas['Organization']> {
    const record = await this.organizations.find(orgId)
    if (!record) throw new NotFoundException(ORGANIZATION_NOT_FOUND)
    return presentOrganization(record)
  }

  async update(orgId: string, input: Schemas['OrganizationUpdate']): Promise<Schemas['Organization']> {
    const record = await this.organizations.update(orgId, { name: input.name?.trim(), budgetCents: input.budget_cents })
    if (!record) throw new NotFoundException(ORGANIZATION_NOT_FOUND)
    return presentOrganization(record)
  }

  async members(orgId: string): Promise<Schemas['MemberList']> {
    return { items: (await this.users.members(orgId)).map(presentMember) }
  }

  async changeRole(orgId: string, caller: AuthUser, userId: string, input: Schemas['MemberUpdate']): Promise<Schemas['Member']> {
    if (!uuid.safeParse(userId).success) throw new NotFoundException(MEMBER_NOT_FOUND)
    const outcome = await this.users.changeRole({ orgId, callerId: caller.id, userId, role: input.role })
    switch (outcome.kind) {
      case MemberOutcomeKind.Changed:
        return presentMember(outcome.member)
      case MemberOutcomeKind.Refused:
        throw new ConflictException(REFUSAL_ERROR[outcome.refusal])
      case MemberOutcomeKind.Missing:
        throw new NotFoundException(MEMBER_NOT_FOUND)
    }
  }

  async remove(orgId: string, caller: AuthUser, userId: string): Promise<void> {
    if (!uuid.safeParse(userId).success) return
    const outcome = await this.users.remove({ orgId, callerId: caller.id, userId })
    if (outcome.kind === MemberOutcomeKind.Refused) throw new ConflictException(REFUSAL_ERROR[outcome.refusal])
  }
}
