import type { RepoProvider } from '@stackbox/contract'
import type { GitConnectionView, RepositoryView } from '@/api/mappers/repository'

export const ALL_PROVIDERS = 'all'

export type RepositoriesFilter = { q: string; provider: RepoProvider | typeof ALL_PROVIDERS }

export const NO_REPOSITORY_FILTER: RepositoriesFilter = { q: '', provider: ALL_PROVIDERS }

export type ConnectionGroup = { connection: GitConnectionView; repositories: RepositoryView[] }

export function filterRepositories(connections: GitConnectionView[], repositories: RepositoryView[], filter: RepositoriesFilter): ConnectionGroup[] {
  const q = filter.q.trim().toLowerCase()
  return connections
    .filter((connection) => filter.provider === ALL_PROVIDERS || connection.provider === filter.provider)
    .map((connection) => ({
      connection,
      repositories: repositories.filter((repository) => repository.connectionId === connection.id && repository.fullName.toLowerCase().includes(q)),
    }))
    .filter((group) => q === '' || group.repositories.length > 0)
}
