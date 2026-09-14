import { Module } from '@nestjs/common'
import { AccessModule } from './access'
import { AuthModule } from './auth'
import { DbModule } from './db'
import { HealthModule } from './health/health.module'
import { OrganizationsModule } from './organizations'
import { ReconcilerModule } from './reconciler/reconciler.module'
import { TasksModule } from './tasks'

@Module({
  imports: [DbModule, HealthModule, AccessModule, AuthModule, OrganizationsModule, TasksModule, ReconcilerModule],
})
export class AppModule {}
