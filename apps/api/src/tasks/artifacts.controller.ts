import { Controller, Get, Inject, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { AccessGuard, Action, RequirePermission } from '../access'
import { JwtCookieGuard } from '../auth'
import { MAX_ARTIFACT_BYTES } from './errors'
import type { ArtifactView } from './presenters/task-detail'
import { TaskService, type UploadedImage } from './task.service'

const ARTIFACTS_RESOURCE = '/organizations/:org_id/artifacts'

@Controller('organizations/:org_id/artifacts')
@UseGuards(JwtCookieGuard, AccessGuard)
export class ArtifactsController {
  constructor(@Inject(TaskService) private readonly tasks: TaskService) {}

  @Post()
  @RequirePermission(ARTIFACTS_RESOURCE, Action.Read)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_ARTIFACT_BYTES } }))
  upload(@Param('org_id') orgId: string, @UploadedFile() file: UploadedImage | undefined): Promise<ArtifactView> {
    return this.tasks.uploadScreenshot(orgId, file)
  }

  @Get(':artifact_id')
  @RequirePermission(ARTIFACTS_RESOURCE, Action.Read)
  get(@Param('org_id') orgId: string, @Param('artifact_id') artifactId: string): Promise<ArtifactView> {
    return this.tasks.artifact(orgId, artifactId)
  }
}
