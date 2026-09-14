import { Test } from '@nestjs/testing'
import { describe, expect, it } from 'vitest'
import { Tokens } from '../auth/tokens'
import { DbModule } from '../db'
import { ApplicationService } from './application.service'
import { ApplicationsModule } from './applications.module'

describe('the applications module', () => {
  it('compiles with the repositories module, the database module and the scripted ports', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [DbModule, ApplicationsModule] })
      .overrideProvider(Tokens)
      .useValue({})
      .compile()

    expect(moduleRef.get(ApplicationService)).toBeInstanceOf(ApplicationService)
    await moduleRef.close()
  })
})
