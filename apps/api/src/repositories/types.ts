import type { RepoProvider } from '@stackbox/contract'
import type { GitConnection, Repository } from '../tasks/types'

export type ApplicationRef = { id: string; name: string }

export type ConnectionView = GitConnection & { repositoryCount: number }

export type RepositoryWithUsage = Repository & { usedBy: ApplicationRef[] }

// What the provider needs to reach one repository: the installation and the provider's own id for it.
export type ProviderRepository = {
  id: string
  fullName: string
  defaultBranch: string
  externalId: string
  installationRef: string
}

export type NewConnection = { orgId: string; provider: RepoProvider; login: string }
