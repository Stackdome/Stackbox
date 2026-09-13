import { Inject, Injectable } from '@nestjs/common'
import { PolicyStore } from '../db'
import { isAllowed } from './calc/policy-match'
import type { AccessRequest, AuthUser } from './types'

@Injectable()
export class AccessService {
  constructor(@Inject(PolicyStore) private readonly policies: PolicyStore) {}

  async can(user: AuthUser, request: AccessRequest): Promise<boolean> {
    const [bindings, policies] = await Promise.all([
      this.policies.bindingsFor(request.orgId, user.id),
      this.policies.policiesFor(request.orgId),
    ])
    return isAllowed(bindings, policies, request)
  }
}
