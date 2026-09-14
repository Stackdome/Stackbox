import type { components } from '@stackbox/contract'
import type { RepoSummary } from '../ports'
import type { ConnectionView, RepositoryWithUsage } from './types'

type Schemas = components['schemas']

export function presentConnection(connection: ConnectionView): Schemas['GitConnection'] {
  return {
    id: connection.id,
    provider: connection.provider,
    account_login: connection.accountLogin ?? connection.installationRef,
    status: connection.status,
    repository_count: connection.repositoryCount,
    created_at: connection.createdAt.toISOString(),
  }
}

export function presentRepository(row: RepositoryWithUsage): Schemas['Repository'] {
  return {
    id: row.id,
    connection_id: row.connectionId,
    provider: row.provider,
    external_id: row.externalId,
    full_name: row.fullName,
    default_branch: row.defaultBranch,
    used_by: row.usedBy,
    created_at: row.createdAt.toISOString(),
  }
}

export function presentAvailable(summary: RepoSummary): Schemas['AvailableRepository'] {
  return { external_id: summary.externalId, full_name: summary.fullName, default_branch: summary.defaultBranch }
}
