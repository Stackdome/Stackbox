import { Test } from '@nestjs/testing'
import { describe, expect, it } from 'vitest'
import { ReconcilerModule } from './reconciler.module'
import { ReconcilerService } from './reconciler.service'

describe('the reconciler module', () => {
  it('compiles with the in-memory ports and task state bound', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ReconcilerModule] }).compile()
    expect(moduleRef.get(ReconcilerService)).toBeInstanceOf(ReconcilerService)
  })
})
