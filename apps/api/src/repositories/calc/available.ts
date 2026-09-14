import type { RepoProvider } from '@stackbox/contract'
import type { RepoSummary } from '../../ports'
import type { Repository } from '../../tasks/types'

export function availableRepositories(
  listed: RepoSummary[],
  added: Pick<Repository, 'provider' | 'externalId'>[],
  provider: RepoProvider,
): RepoSummary[] {
  const taken = new Set(added.filter((row) => row.provider === provider).map((row) => row.externalId))
  return listed.filter((summary) => !taken.has(summary.externalId))
}

export function pickListed(listed: RepoSummary[], externalIds: string[]): RepoSummary[] | null {
  const picked = externalIds.map((externalId) => listed.find((summary) => summary.externalId === externalId))
  return picked.every((summary): summary is RepoSummary => summary !== undefined) ? picked : null
}
