import { Global, Module } from '@nestjs/common'
import { ApiTokenStore } from './api-token-store'
import { ApplicationStore } from './application-store'
import { ArtifactStore } from './artifact-store'
import { DATABASE_CONNECTION, createDb } from './client'
import { DrizzleTaskState } from './drizzle-task-state'
import { GitConnectionStore } from './git-connection-store'
import { InstanceStore } from './instance-store'
import { InviteStore } from './invite-store'
import { OrganizationStore } from './organization-store'
import { PolicyStore } from './policy-store'
import { ReleaseStore } from './release-store'
import { RepositoryStore } from './repository-store'
import { TaskStore } from './task-store'
import { UserStore } from './user-store'

export { DATABASE_CONNECTION }

const STORES = [
  UserStore,
  PolicyStore,
  ApplicationStore,
  TaskStore,
  ArtifactStore,
  DrizzleTaskState,
  GitConnectionStore,
  RepositoryStore,
  InstanceStore,
  ReleaseStore,
  OrganizationStore,
  InviteStore,
  ApiTokenStore,
]

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: () => createDb(process.env.DATABASE_URL),
    },
    ...STORES,
  ],
  exports: [DATABASE_CONNECTION, ...STORES],
})
export class DbModule {}
