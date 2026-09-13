import { Inject, Injectable } from '@nestjs/common'
import { ApplicationStore } from '../db'
import type { ApplicationRef } from './types'

@Injectable()
export class OrganizationService {
  constructor(@Inject(ApplicationStore) private readonly applications: ApplicationStore) {}

  listApplications(orgId: string): Promise<ApplicationRef[]> {
    return this.applications.listByOrg(orgId)
  }
}
