import { Module } from '@nestjs/common'
import { DrizzleTaskState } from '../db'
import { PortsModule } from '../ports/ports.module'
import { settingsFrom } from './bindings'
import { ReconcilerService } from './reconciler.service'
import { RECONCILER_SETTINGS } from './settings'
import { TASK_STATE } from './task-state'

@Module({
  imports: [PortsModule],
  providers: [
    ReconcilerService,
    { provide: TASK_STATE, useExisting: DrizzleTaskState },
    { provide: RECONCILER_SETTINGS, useFactory: () => settingsFrom(process.env) },
  ],
  exports: [ReconcilerService],
})
export class ReconcilerModule {}
