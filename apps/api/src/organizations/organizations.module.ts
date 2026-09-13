import { Module } from '@nestjs/common'
import { AccessModule } from '../access'
import { AuthModule } from '../auth'
import { ApplicationsController } from './applications.controller'
import { OrganizationService } from './organization.service'

@Module({
  imports: [AuthModule, AccessModule],
  controllers: [ApplicationsController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationsModule {}
