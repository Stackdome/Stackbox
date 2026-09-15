import { Module } from '@nestjs/common'
import { AccessModule } from '../access'
import { AuthModule } from '../auth'
import { PortsModule } from '../ports/ports.module'
import { InviteService } from './invite.service'
import { InviteAcceptController, InvitesController } from './invites.controller'
import { OrganizationService } from './organization.service'
import { OrganizationsController } from './organizations.controller'

@Module({
  imports: [AuthModule, AccessModule, PortsModule],
  controllers: [OrganizationsController, InvitesController, InviteAcceptController],
  providers: [OrganizationService, InviteService],
  exports: [OrganizationService, InviteService],
})
export class OrganizationsModule {}
