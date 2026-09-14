import { Test } from '@nestjs/testing'
import { describe, expect, it } from 'vitest'
import { AGENT_RUNTIME } from '../ports'
import { ScriptedAgentRuntime } from '../ports/fakes'
import { InMemoryTaskState } from './in-memory-task-state'
import { ReconcilerModule } from './reconciler.module'
import { ReconcilerService } from './reconciler.service'
import { TASK_STATE } from './task-state'

describe('the reconciler module', () => {
  it('compiles with the scripted ports when no agent runtime is configured', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ReconcilerModule] })
      .overrideProvider(TASK_STATE)
      .useClass(InMemoryTaskState)
      .compile()

    expect([moduleRef.get(ReconcilerService) instanceof ReconcilerService, moduleRef.get(AGENT_RUNTIME) instanceof ScriptedAgentRuntime]).toEqual([true, true])
  })
})
