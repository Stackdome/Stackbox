import { Module } from '@nestjs/common'
import { AccessModule } from '../access'
import { AuthModule } from '../auth'
import { PortsModule } from '../ports/ports.module'
import { ReleaseService } from './release.service'
import { ReleasesController } from './releases.controller'

@Module({
  imports: [AuthModule, AccessModule, PortsModule],
  controllers: [ReleasesController],
  providers: [ReleaseService],
  exports: [ReleaseService],
})
export class ReleasesModule {}
