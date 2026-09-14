import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, UseGuards } from '@nestjs/common'
import { type components, schemas } from '@stackbox/contract'
import { AccessGuard, Action, ApplicationSource, type AuthUser, RequirePermission } from '../access'
import { CurrentUser, JwtCookieGuard } from '../auth'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { InstanceService } from './instance.service'

type Schemas = components['schemas']

const INSTANCES_RESOURCE = '/organizations/:org_id/instances'
const INSTANCE_RESOURCE = '/organizations/:org_id/instances/:instance_id'
const APPLICATION_INSTANCES_RESOURCE = '/organizations/:org_id/applications/:application_id/instances'

@Controller('organizations/:org_id/instances')
@UseGuards(JwtCookieGuard, AccessGuard)
export class InstancesController {
  constructor(@Inject(InstanceService) private readonly instances: InstanceService) {}

  @Get()
  @RequirePermission(INSTANCES_RESOURCE, Action.List)
  list(
    @Param('org_id') orgId: string,
    @Query('application_id') applicationId: string | undefined,
    @Query('include_torn_down') includeTornDown: string | undefined,
  ): Promise<Schemas['InstanceList']> {
    return this.instances.list(orgId, { applicationId, includeTornDown: includeTornDown === 'true' })
  }

  @Post()
  @RequirePermission(APPLICATION_INSTANCES_RESOURCE, Action.Create, ApplicationSource.Body)
  spinUp(
    @Param('org_id') orgId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(schemas.InstanceSpinUp)) input: Schemas['InstanceSpinUp'],
  ): Promise<Schemas['InstanceDetail']> {
    return this.instances.spinUp(orgId, user, input)
  }

  @Get(':instance_id')
  @RequirePermission(INSTANCE_RESOURCE, Action.Read)
  get(@Param('org_id') orgId: string, @Param('instance_id') instanceId: string): Promise<Schemas['InstanceDetail']> {
    return this.instances.detail(orgId, instanceId)
  }

  @Post(':instance_id/teardown')
  @HttpCode(200)
  @RequirePermission(INSTANCE_RESOURCE, Action.Write)
  teardown(@Param('org_id') orgId: string, @Param('instance_id') instanceId: string): Promise<Schemas['InstanceDetail']> {
    return this.instances.teardown(orgId, instanceId)
  }

  @Post(':instance_id/expiry')
  @HttpCode(200)
  @RequirePermission(INSTANCE_RESOURCE, Action.Write)
  extendExpiry(
    @Param('org_id') orgId: string,
    @Param('instance_id') instanceId: string,
    @Body(new ZodValidationPipe(schemas.InstanceExpiryExtend)) input: Schemas['InstanceExpiryExtend'],
  ): Promise<Schemas['InstanceDetail']> {
    return this.instances.extendExpiry(orgId, instanceId, input)
  }
}
