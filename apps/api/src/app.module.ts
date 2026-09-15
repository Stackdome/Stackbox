import { Module } from '@nestjs/common'
import { AccessModule } from './access'
import { ApplicationsModule } from './applications'
import { AuthModule } from './auth'
import { DbModule } from './db'
import { HealthModule } from './health/health.module'
import { InstancesModule } from './instances'
import { OrganizationsModule } from './organizations'
import { ReconcilerModule } from './reconciler/reconciler.module'
import { RepositoriesModule } from './repositories'
import { TasksModule } from './tasks'

@Module({
  imports: [
    DbModule,
    HealthModule,
    AccessModule,
    AuthModule,
    OrganizationsModule,
    RepositoriesModule,
    ApplicationsModule,
    TasksModule,
    InstancesModule,
    ReconcilerModule,
  ],
})
export class AppModule {}
