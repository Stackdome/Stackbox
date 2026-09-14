import { Test } from '@nestjs/testing'
import { describe, expect, it } from 'vitest'
import { Tokens } from '../auth/tokens'
import { DbModule } from '../db'
import { InstanceService } from './instance.service'
import { InstancesModule } from './instances.module'

describe('the instances module', () => {
  it('compiles with the releases module, the database module and the scripted ports', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [DbModule, InstancesModule] })
      .overrideProvider(Tokens)
      .useValue({})
      .compile()

    expect(moduleRef.get(InstanceService)).toBeInstanceOf(InstanceService)
    await moduleRef.close()
  })
})
