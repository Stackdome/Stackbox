import { Module } from '@nestjs/common'
import { AccessModule } from '../access'
import { AuthModule } from '../auth'
import { PortsModule } from '../ports/ports.module'
import { ReleasesModule } from '../releases'
import { InstanceService } from './instance.service'
import { InstancesController } from './instances.controller'

@Module({
  imports: [AuthModule, AccessModule, PortsModule, ReleasesModule],
  controllers: [InstancesController],
  providers: [InstanceService],
  exports: [InstanceService],
})
export class InstancesModule {}
