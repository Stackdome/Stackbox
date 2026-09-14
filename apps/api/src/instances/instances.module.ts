import { Module } from '@nestjs/common'
import { AccessModule } from '../access'
import { AuthModule } from '../auth'
import { PortsModule } from '../ports/ports.module'
import { ReleasesModule } from '../releases'
import { InstanceService } from './instance.service'
import { InstanceSweep, SWEEP_SETTINGS, type SweepSettings } from './instance-sweep'
import { InstancesController } from './instances.controller'

@Module({
  imports: [AuthModule, AccessModule, PortsModule, ReleasesModule],
  controllers: [InstancesController],
  providers: [
    InstanceService,
    InstanceSweep,
    { provide: SWEEP_SETTINGS, useFactory: (): SweepSettings => ({ tickEnabled: process.env.RECONCILER_ENABLED !== 'false' }) },
  ],
  exports: [InstanceService],
})
export class InstancesModule {}
