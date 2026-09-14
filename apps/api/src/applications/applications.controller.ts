import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { type components, schemas } from '@stackbox/contract'
import { AccessGuard, Action, ApplicationSource, RequirePermission } from '../access'
import { JwtCookieGuard } from '../auth'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { ApplicationService } from './application.service'

type Schemas = components['schemas']

const APPLICATIONS_RESOURCE = '/organizations/:org_id/applications'
const APPLICATION_RESOURCE = '/organizations/:org_id/applications/:application_id'

@Controller('organizations/:org_id/applications')
@UseGuards(JwtCookieGuard, AccessGuard)
export class ApplicationsController {
  constructor(@Inject(ApplicationService) private readonly applications: ApplicationService) {}

  @Get()
  @RequirePermission(APPLICATIONS_RESOURCE, Action.List)
  list(@Param('org_id') orgId: string): Promise<Schemas['ApplicationList']> {
    return this.applications.list(orgId)
  }

  @Post('detect')
  @HttpCode(200)
  @RequirePermission(APPLICATIONS_RESOURCE, Action.Create)
  detect(
    @Param('org_id') orgId: string,
    @Body(new ZodValidationPipe(schemas.StackfileDetect)) input: Schemas['StackfileDetect'],
  ): Promise<Schemas['StackfileDetection']> {
    return this.applications.detect(orgId, input)
  }

  @Post()
  @RequirePermission(APPLICATIONS_RESOURCE, Action.Create)
  create(
    @Param('org_id') orgId: string,
    @Body(new ZodValidationPipe(schemas.ApplicationCreate)) input: Schemas['ApplicationCreate'],
  ): Promise<Schemas['ApplicationDetail']> {
    return this.applications.create(orgId, input)
  }

  @Get(':application_id')
  @RequirePermission(APPLICATION_RESOURCE, Action.Read, ApplicationSource.Path)
  get(@Param('org_id') orgId: string, @Param('application_id') applicationId: string): Promise<Schemas['ApplicationDetail']> {
    return this.applications.detail(orgId, applicationId)
  }

  @Get(':application_id/services')
  @RequirePermission(`${APPLICATION_RESOURCE}/services`, Action.Read, ApplicationSource.Path)
  services(@Param('org_id') orgId: string, @Param('application_id') applicationId: string): Promise<Schemas['ServiceList']> {
    return this.applications.services(orgId, applicationId)
  }

  @Patch(':application_id')
  @RequirePermission(APPLICATION_RESOURCE, Action.Write, ApplicationSource.Path)
  update(
    @Param('org_id') orgId: string,
    @Param('application_id') applicationId: string,
    @Body(new ZodValidationPipe(schemas.ApplicationUpdate)) input: Schemas['ApplicationUpdate'],
  ): Promise<Schemas['ApplicationDetail']> {
    return this.applications.update(orgId, applicationId, input)
  }

  @Post(':application_id/sync')
  @HttpCode(200)
  @RequirePermission(APPLICATION_RESOURCE, Action.Write, ApplicationSource.Path)
  sync(@Param('org_id') orgId: string, @Param('application_id') applicationId: string): Promise<Schemas['ApplicationDetail']> {
    return this.applications.sync(orgId, applicationId)
  }

  @Delete(':application_id')
  @HttpCode(204)
  @RequirePermission(APPLICATION_RESOURCE, Action.Delete, ApplicationSource.Path)
  remove(@Param('org_id') orgId: string, @Param('application_id') applicationId: string): Promise<void> {
    return this.applications.remove(orgId, applicationId)
  }
}
