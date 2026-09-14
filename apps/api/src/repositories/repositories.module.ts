import { Module } from '@nestjs/common'
import { AccessModule } from '../access'
import { AuthModule } from '../auth'
import { PortsModule } from '../ports/ports.module'
import { GitConnectionsController } from './git-connections.controller'
import { RepositoriesController } from './repositories.controller'
import { RepositoryService } from './repository.service'

@Module({
  imports: [AuthModule, AccessModule, PortsModule],
  controllers: [GitConnectionsController, RepositoriesController],
  providers: [RepositoryService],
  exports: [RepositoryService],
})
export class RepositoriesModule {}
