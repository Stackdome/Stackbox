import { Module } from '@nestjs/common'
import { AccessModule } from '../access'
import { AuthModule } from '../auth'
import { OrganizationService } from './organization.service'
import { OrganizationsController } from './organizations.controller'

@Module({
  imports: [AuthModule, AccessModule],
  controllers: [OrganizationsController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationsModule {}
