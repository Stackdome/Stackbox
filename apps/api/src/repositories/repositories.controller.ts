import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, UseGuards } from '@nestjs/common'
import { type components, schemas } from '@stackbox/contract'
import { AccessGuard, Action, RequirePermission } from '../access'
import { JwtCookieGuard } from '../auth'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { RepositoryService } from './repository.service'

type Schemas = components['schemas']

const REPOSITORIES_RESOURCE = '/organizations/:org_id/repositories'

@Controller('organizations/:org_id/repositories')
@UseGuards(JwtCookieGuard, AccessGuard)
export class RepositoriesController {
  constructor(@Inject(RepositoryService) private readonly repositories: RepositoryService) {}

  @Get()
  @RequirePermission(REPOSITORIES_RESOURCE, Action.List)
  list(@Param('org_id') orgId: string): Promise<Schemas['RepositoryList']> {
    return this.repositories.listRepositories(orgId)
  }

  @Post()
  @RequirePermission(REPOSITORIES_RESOURCE, Action.Create)
  add(
    @Param('org_id') orgId: string,
    @Body(new ZodValidationPipe(schemas.RepositoryAdd)) input: Schemas['RepositoryAdd'],
  ): Promise<Schemas['RepositoryList']> {
    return this.repositories.add(orgId, input)
  }

  @Delete(':repository_id')
  @HttpCode(204)
  @RequirePermission(`${REPOSITORIES_RESOURCE}/:repository_id`, Action.Delete)
  remove(@Param('org_id') orgId: string, @Param('repository_id') repositoryId: string): Promise<void> {
    return this.repositories.remove(orgId, repositoryId)
  }
}
