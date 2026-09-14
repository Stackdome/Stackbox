import { Body, Controller, Get, HttpCode, Inject, Param, Post, UseGuards } from '@nestjs/common'
import { type components, schemas } from '@stackbox/contract'
import { AccessGuard, Action, RequirePermission } from '../access'
import { JwtCookieGuard } from '../auth'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { RepositoryService } from './repository.service'

type Schemas = components['schemas']

const CONNECTIONS_RESOURCE = '/organizations/:org_id/git-connections'
const CONNECTION_RESOURCE = '/organizations/:org_id/git-connections/:connection_id'

@Controller('organizations/:org_id/git-connections')
@UseGuards(JwtCookieGuard, AccessGuard)
export class GitConnectionsController {
  constructor(@Inject(RepositoryService) private readonly repositories: RepositoryService) {}

  @Get()
  @RequirePermission(CONNECTIONS_RESOURCE, Action.List)
  list(@Param('org_id') orgId: string): Promise<Schemas['GitConnectionList']> {
    return this.repositories.listConnections(orgId)
  }

  @Post()
  @RequirePermission(CONNECTIONS_RESOURCE, Action.Create)
  create(
    @Param('org_id') orgId: string,
    @Body(new ZodValidationPipe(schemas.GitConnectionCreate)) input: Schemas['GitConnectionCreate'],
  ): Promise<Schemas['GitConnection']> {
    return this.repositories.connect(orgId, input)
  }

  @Post(':connection_id/verify')
  @HttpCode(200)
  @RequirePermission(CONNECTION_RESOURCE, Action.Write)
  verify(@Param('org_id') orgId: string, @Param('connection_id') connectionId: string): Promise<Schemas['GitConnection']> {
    return this.repositories.verify(orgId, connectionId)
  }

  @Get(':connection_id/available-repositories')
  @RequirePermission(CONNECTION_RESOURCE, Action.Read)
  available(@Param('org_id') orgId: string, @Param('connection_id') connectionId: string): Promise<Schemas['AvailableRepositoryList']> {
    return this.repositories.available(orgId, connectionId)
  }
}
