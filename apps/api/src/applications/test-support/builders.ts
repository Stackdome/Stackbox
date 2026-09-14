import { InMemoryGitProvider } from '../../ports/fakes'
import { aProviderRepository } from '../../repositories/test-support/builders'
import type { ApplicationRecord, ServiceRecord } from '../types'

const AT = new Date('2026-09-14T10:00:00Z')

export const SHOP_LISTED = aProviderRepository('gh-1001', 'acme/shop')

export const A_STACKFILE = Buffer.from(['services:', '  api: { path: apps/api }', '  postgres: { image: postgres:17 }', ''].join('\n'))

export function aShopListing(headSha: string, files: Record<string, Buffer> = { 'stackfile.yaml': A_STACKFILE }): InMemoryGitProvider {
  const git = new InMemoryGitProvider()
  git.seedRepository({ summary: SHOP_LISTED, headSha, files })
  return git
}

export function anApplicationRecord(overrides: Partial<ApplicationRecord> = {}): ApplicationRecord {
  return {
    id: 'A1',
    orgId: 'O1',
    name: 'shop',
    slug: 'shop',
    stackfilePath: null,
    syncedAtSha: 'origin-sha',
    validatedAt: AT,
    validationError: null,
    credentialsRef: {},
    createdAt: AT,
    repository: { id: 'R1', fullName: 'acme/shop', defaultBranch: 'main', externalId: 'gh-1001', installationRef: 'acme' },
    serviceNames: [],
    taskCount: 0,
    ...overrides,
  }
}

export function aServiceRecord(overrides: Partial<ServiceRecord> = {}): ServiceRecord {
  return { id: 'S1', name: 'api', path: 'apps/api', image: null, repository: { id: 'R1', fullName: 'acme/shop', defaultBranch: 'main' }, ...overrides }
}
