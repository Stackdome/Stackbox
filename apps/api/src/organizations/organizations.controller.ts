import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, UseGuards } from '@nestjs/common'
import { type components, schemas } from '@stackbox/contract'
import { AccessGuard, Action, type AuthUser, RequirePermission } from '../access'
import { CurrentUser, JwtCookieGuard } from '../auth'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { OrganizationService } from './organization.service'

type Schemas = components['schemas']

const ORGANIZATION_RESOURCE = '/organizations/:org_id'
const MEMBERS_RESOURCE = '/organizations/:org_id/users'
const MEMBER_RESOURCE = '/organizations/:org_id/users/:user_id'

@Controller('organizations/:org_id')
@UseGuards(JwtCookieGuard, AccessGuard)
export class OrganizationsController {
  constructor(@Inject(OrganizationService) private readonly organizations: OrganizationService) {}

  @Get()
  @RequirePermission(ORGANIZATION_RESOURCE, Action.Read)
  get(@Param('org_id') orgId: string): Promise<Schemas['Organization']> {
    return this.organizations.organization(orgId)
  }

  @Patch()
  @RequirePermission(ORGANIZATION_RESOURCE, Action.Write)
  update(
    @Param('org_id') orgId: string,
    @Body(new ZodValidationPipe(schemas.OrganizationUpdate)) input: Schemas['OrganizationUpdate'],
  ): Promise<Schemas['Organization']> {
    return this.organizations.update(orgId, input)
  }

  @Get('users')
  @RequirePermission(MEMBERS_RESOURCE, Action.List)
  members(@Param('org_id') orgId: string): Promise<Schemas['MemberList']> {
    return this.organizations.members(orgId)
  }

  @Patch('users/:user_id')
  @RequirePermission(MEMBER_RESOURCE, Action.Write)
  changeRole(
    @Param('org_id') orgId: string,
    @Param('user_id') userId: string,
    @CurrentUser() caller: AuthUser,
    @Body(new ZodValidationPipe(schemas.MemberUpdate)) input: Schemas['MemberUpdate'],
  ): Promise<Schemas['Member']> {
    return this.organizations.changeRole(orgId, caller, userId, input)
  }

  @Delete('users/:user_id')
  @HttpCode(204)
  @RequirePermission(MEMBER_RESOURCE, Action.Delete)
  remove(@Param('org_id') orgId: string, @Param('user_id') userId: string, @CurrentUser() caller: AuthUser): Promise<void> {
    return this.organizations.remove(orgId, caller, userId)
  }
}
