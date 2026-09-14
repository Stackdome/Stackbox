import { Module } from '@nestjs/common'
import { agentRuntimeFor } from './agent-runtime'
import { type InMemorySandboxProvider, ScriptedClock, ScriptedDeployTarget, ScriptedGitProvider, ScriptedSandboxProvider } from './fakes'
import type { Clock } from './ports'
import { AGENT_RUNTIME, CLOCK, DEPLOY_TARGET, GIT_PROVIDER, SANDBOX_PROVIDER } from './tokens'

// Sandbox, deploy and git bind scripted fakes; only the agent runtime has a real adapter.
@Module({
  providers: [
    { provide: CLOCK, useClass: ScriptedClock },
    { provide: SANDBOX_PROVIDER, useFactory: (clock: Clock) => new ScriptedSandboxProvider(clock), inject: [CLOCK] },
    {
      provide: AGENT_RUNTIME,
      useFactory: (clock: Clock, sandboxes: InMemorySandboxProvider) => agentRuntimeFor(process.env, clock, sandboxes),
      inject: [CLOCK, SANDBOX_PROVIDER],
    },
    { provide: DEPLOY_TARGET, useFactory: (clock: Clock) => new ScriptedDeployTarget(clock), inject: [CLOCK] },
    { provide: GIT_PROVIDER, useClass: ScriptedGitProvider },
  ],
  exports: [CLOCK, SANDBOX_PROVIDER, AGENT_RUNTIME, DEPLOY_TARGET, GIT_PROVIDER],
})
export class PortsModule {}
