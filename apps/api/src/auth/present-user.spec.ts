import { describe, expect, it } from 'vitest'
import { aUser } from '../organizations/test-support/builders'
import { presentUser } from './present-user'

describe('presentUser', () => {
  it('names the organization under the contract organisation fields', () => {
    const presented = presentUser(aUser({ orgId: 'O1', organizationName: 'acme' }))

    expect({ organisation: presented.organisation, organisation_id: presented.organisation_id }).toEqual({ organisation: 'acme', organisation_id: 'O1' })
  })
})
