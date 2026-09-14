import { Module } from '@nestjs/common'
import { DrizzleTaskState } from '../db'
import { AGENT_RUNTIME, CLOCK, type Clock, DEPLOY_TARGET, GIT_PROVIDER, SANDBOX_PROVIDER } from '../ports'
import { type InMemorySandboxProvider, ScriptedClock, ScriptedDeployTarget, ScriptedGitProvider, ScriptedSandboxProvider } from '../ports/fakes'
import { agentRuntimeFor, settingsFrom } from './bindings'
import { ReconcilerService } from './reconciler.service'
import { RECONCILER_SETTINGS } from './settings'
import { TASK_STATE } from './task-state'

// Sandbox, deploy and git bind scripted fakes; only the agent runtime has a real adapter.
@Module({
  providers: [
    ReconcilerService,
    { provide: CLOCK, useClass: ScriptedClock },
    { provide: SANDBOX_PROVIDER, useFactory: (clock: Clock) => new ScriptedSandboxProvider(clock), inject: [CLOCK] },
    {
      provide: AGENT_RUNTIME,
      useFactory: (clock: Clock, sandboxes: InMemorySandboxProvider) => agentRuntimeFor(process.env, clock, sandboxes),
      inject: [CLOCK, SANDBOX_PROVIDER],
    },
    { provide: DEPLOY_TARGET, useFactory: (clock: Clock) => new ScriptedDeployTarget(clock), inject: [CLOCK] },
    { provide: GIT_PROVIDER, useClass: ScriptedGitProvider },
    { provide: TASK_STATE, useExisting: DrizzleTaskState },
    { provide: RECONCILER_SETTINGS, useFactory: () => settingsFrom(process.env) },
  ],
  exports: [ReconcilerService],
})
export class ReconcilerModule {}
