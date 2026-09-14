import { Test } from '@nestjs/testing'
import { describe, expect, it } from 'vitest'
import { Tokens } from '../auth/tokens'
import { DbModule } from '../db'
import { ReleaseService } from './release.service'
import { ReleasesModule } from './releases.module'

describe('the releases module', () => {
  it('compiles with the database module and the scripted ports', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [DbModule, ReleasesModule] })
      .overrideProvider(Tokens)
      .useValue({})
      .compile()

    expect(moduleRef.get(ReleaseService)).toBeInstanceOf(ReleaseService)
    await moduleRef.close()
  })
})
