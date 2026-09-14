import { Module } from '@nestjs/common'
import { AccessModule } from './access'
import { ApplicationsModule } from './applications'
import { AuthModule } from './auth'
import { DbModule } from './db'
import { HealthModule } from './health/health.module'
import { ReconcilerModule } from './reconciler/reconciler.module'
import { RepositoriesModule } from './repositories'
import { TasksModule } from './tasks'

@Module({
  imports: [DbModule, HealthModule, AccessModule, AuthModule, RepositoriesModule, ApplicationsModule, TasksModule, ReconcilerModule],
})
export class AppModule {}
