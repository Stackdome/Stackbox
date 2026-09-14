import { Module } from '@nestjs/common'
import { AccessModule } from '../access'
import { AuthModule } from '../auth'
import { ArtifactsController } from './artifacts.controller'
import { TaskService } from './task.service'
import { TasksController } from './tasks.controller'

@Module({
  imports: [AuthModule, AccessModule],
  controllers: [TasksController, ArtifactsController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TasksModule {}
