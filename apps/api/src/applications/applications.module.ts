import { Module } from '@nestjs/common'
import { AccessModule } from '../access'
import { AuthModule } from '../auth'
import { PortsModule } from '../ports/ports.module'
import { RepositoriesModule } from '../repositories'
import { ApplicationService } from './application.service'
import { ApplicationsController } from './applications.controller'

@Module({
  imports: [AuthModule, AccessModule, PortsModule, RepositoriesModule],
  controllers: [ApplicationsController],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationsModule {}
