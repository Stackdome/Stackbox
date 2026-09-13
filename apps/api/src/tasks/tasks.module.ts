import { Module } from '@nestjs/common'
import { AccessModule } from '../access'
import { AuthModule } from '../auth'
import { TaskService } from './task.service'
import { TasksController } from './tasks.controller'

@Module({
  imports: [AuthModule, AccessModule],
  controllers: [TasksController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TasksModule {}
