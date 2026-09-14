import { RepoProvider } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { aRepository } from '../../tasks/test-support/builders'
import { aProviderRepository } from '../test-support/builders'
import { availableRepositories, pickListed } from './available'

const SHOP = aProviderRepository('gh-1001', 'acme/shop')
const ACME_API = aProviderRepository('gh-1004', 'acme/acme-api')

describe('availableRepositories', () => {
  it('offers the listed repositories the organization has not added through that provider', () => {
    const added = [aRepository({ externalId: 'gh-1001', provider: RepoProvider.Github }), aRepository({ externalId: 'gh-1004', provider: RepoProvider.Gitlab })]

    expect(availableRepositories([SHOP, ACME_API], added, RepoProvider.Github)).toEqual([ACME_API])
  })
})

describe('pickListed', () => {
  it('picks the listed repositories in the order they were asked for', () => {
    expect(pickListed([SHOP, ACME_API], ['gh-1004', 'gh-1001'])).toEqual([ACME_API, SHOP])
  })

  it('picks nothing when one requested id is not listed', () => {
    expect(pickListed([SHOP], ['gh-1001', 'gh-9999'])).toBeNull()
  })
})
