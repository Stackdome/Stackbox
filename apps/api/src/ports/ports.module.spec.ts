import { Test } from '@nestjs/testing'
import { describe, expect, it } from 'vitest'
import { ScriptedAgentRuntime, ScriptedClock, ScriptedDeployTarget, ScriptedGitProvider, ScriptedSandboxProvider } from './fakes'
import { PortsModule } from './ports.module'
import { AGENT_RUNTIME, CLOCK, DEPLOY_TARGET, GIT_PROVIDER, SANDBOX_PROVIDER } from './tokens'

describe('the ports module', () => {
  it('binds the scripted fakes to all five port tokens when no agent runtime is configured', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [PortsModule] }).compile()

    expect([
      moduleRef.get(CLOCK) instanceof ScriptedClock,
      moduleRef.get(SANDBOX_PROVIDER) instanceof ScriptedSandboxProvider,
      moduleRef.get(AGENT_RUNTIME) instanceof ScriptedAgentRuntime,
      moduleRef.get(DEPLOY_TARGET) instanceof ScriptedDeployTarget,
      moduleRef.get(GIT_PROVIDER) instanceof ScriptedGitProvider,
    ]).toEqual([true, true, true, true, true])
  })
})
