import { RepoProvider } from '@stackbox/contract'
import type { ConnectionRef, RepoSummary } from '../../ports'
import { InMemoryGitProvider } from '../../ports/fakes'

export const LISTED_HEAD_SHA = 'origin-sha'

export function aProviderRepository(externalId: string, fullName: string, overrides: Partial<RepoSummary> = {}): RepoSummary {
  return { id: externalId, provider: RepoProvider.Github, externalId, fullName, defaultBranch: 'main', ...overrides }
}

export function aGitListing(...summaries: RepoSummary[]): InMemoryGitProvider {
  const git = new InMemoryGitProvider()
  for (const summary of summaries) {
    git.seedRepository({ summary, headSha: LISTED_HEAD_SHA })
  }
  return git
}

export class RefusingGitProvider extends InMemoryGitProvider {
  override async listRepositories(_conn: ConnectionRef): Promise<RepoSummary[]> {
    throw new Error('Bad credentials')
  }
}
