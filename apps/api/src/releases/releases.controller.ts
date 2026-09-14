import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common'
import { type components, schemas } from '@stackbox/contract'
import { AccessGuard, Action, RequirePermission } from '../access'
import { JwtCookieGuard } from '../auth'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { ReleaseService } from './release.service'

type Schemas = components['schemas']

const INSTANCE_RELEASES_RESOURCE = '/organizations/:org_id/instances/:instance_id/releases'

@Controller('organizations/:org_id/instances/:instance_id/releases')
@UseGuards(JwtCookieGuard, AccessGuard)
export class ReleasesController {
  constructor(@Inject(ReleaseService) private readonly releases: ReleaseService) {}

  @Get()
  @RequirePermission(INSTANCE_RELEASES_RESOURCE, Action.Read)
  list(@Param('org_id') orgId: string, @Param('instance_id') instanceId: string): Promise<Schemas['ReleaseList']> {
    return this.releases.list(orgId, instanceId)
  }

  @Post()
  @RequirePermission(INSTANCE_RELEASES_RESOURCE, Action.Create)
  create(
    @Param('org_id') orgId: string,
    @Param('instance_id') instanceId: string,
    @Body(new ZodValidationPipe(schemas.ReleaseCreate)) input: Schemas['ReleaseCreate'],
  ): Promise<Schemas['Release']> {
    return this.releases.create(orgId, instanceId, input)
  }
}
