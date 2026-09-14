import { RepoProvider } from '@stackbox/contract'
import type { RepoSummary } from '../../ports'

export function aProviderRepository(externalId: string, fullName: string, overrides: Partial<RepoSummary> = {}): RepoSummary {
  return { id: externalId, provider: RepoProvider.Github, externalId, fullName, defaultBranch: 'main', ...overrides }
}
