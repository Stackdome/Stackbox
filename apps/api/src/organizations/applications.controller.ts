import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common'
import type { components } from '@stackbox/contract'
import { AccessGuard, Action, RequirePermission } from '../access'
import { JwtCookieGuard } from '../auth'
import { OrganizationService } from './organization.service'

@Controller('organizations/:org_id/applications')
@UseGuards(JwtCookieGuard, AccessGuard)
export class ApplicationsController {
  constructor(@Inject(OrganizationService) private readonly organizations: OrganizationService) {}

  @Get()
  @RequirePermission('/organizations/:org_id/applications', Action.List)
  async list(@Param('org_id') orgId: string): Promise<components['schemas']['ApplicationList']> {
    const items = await this.organizations.listApplications(orgId)
    return { items, total: items.length }
  }
}
