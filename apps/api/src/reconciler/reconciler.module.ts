import { randomUUID } from 'node:crypto'
import { Module } from '@nestjs/common'
import { AGENT_RUNTIME, CLOCK, type Clock, DEPLOY_TARGET, GIT_PROVIDER, SANDBOX_PROVIDER } from '../ports'
import {
  InMemoryAgentRuntime,
  InMemoryClock,
  InMemoryDeployTarget,
  InMemoryGitProvider,
  InMemorySandboxProvider,
} from '../ports/fakes'
import { InMemoryTaskState } from './in-memory-task-state'
import { ReconcilerService } from './reconciler.service'
import { RECONCILER_SETTINGS, type ReconcilerSettings } from './settings'
import { TASK_STATE } from './task-state'

const settings: ReconcilerSettings = {
  owner: `${process.pid}:${randomUUID()}`,
  claimLimit: 10,
  gitHost: 'github.com',
  readToken: 'in-memory-read-token',
}

// Slice 4 replaces these bindings with the Drizzle task state and the configured adapters, and AppModule imports this module then.
@Module({
  providers: [
    ReconcilerService,
    { provide: CLOCK, useFactory: () => new InMemoryClock(new Date()) },
    { provide: SANDBOX_PROVIDER, useClass: InMemorySandboxProvider },
    {
      provide: AGENT_RUNTIME,
      useFactory: (sandboxes: InMemorySandboxProvider, clock: Clock) => new InMemoryAgentRuntime(sandboxes, clock),
      inject: [SANDBOX_PROVIDER, CLOCK],
    },
    { provide: DEPLOY_TARGET, useClass: InMemoryDeployTarget },
    { provide: GIT_PROVIDER, useClass: InMemoryGitProvider },
    { provide: TASK_STATE, useClass: InMemoryTaskState },
    { provide: RECONCILER_SETTINGS, useValue: settings },
  ],
  exports: [ReconcilerService],
})
export class ReconcilerModule {}
