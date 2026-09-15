import { Test } from '@nestjs/testing'
import { describe, expect, it } from 'vitest'
import { Tokens } from '../auth/tokens'
import { DbModule } from '../db'
import { OrganizationService } from './organization.service'
import { OrganizationsModule } from './organizations.module'

describe('the organizations module', () => {
  it('compiles with the auth, access and database modules', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [DbModule, OrganizationsModule] })
      .overrideProvider(Tokens)
      .useValue({})
      .compile()

    expect(moduleRef.get(OrganizationService)).toBeInstanceOf(OrganizationService)
    await moduleRef.close()
  })
})
