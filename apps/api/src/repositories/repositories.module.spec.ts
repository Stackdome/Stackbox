import { Test } from '@nestjs/testing'
import { describe, expect, it } from 'vitest'
import { Tokens } from '../auth/tokens'
import { DbModule } from '../db'
import { RepositoriesModule } from './repositories.module'
import { RepositoryService } from './repository.service'

describe('the repositories module', () => {
  it('compiles against the database module and the scripted ports', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [DbModule, RepositoriesModule] })
      .overrideProvider(Tokens)
      .useValue({})
      .compile()

    expect(moduleRef.get(RepositoryService)).toBeInstanceOf(RepositoryService)
    await moduleRef.close()
  })
})
