import { ConnectionStatus, RepoProvider, type components } from '@stackbox/contract'
import type { ProviderId } from '@/components/branded/brand-icon-registry'
import { type Application, toApplication } from './application'

type Schemas = components['schemas']

export type GitConnectionView = {
  id: string
  provider: RepoProvider
  logo: ProviderId
  accountLogin: string
  title: string
  status: ConnectionStatus
  needsReauth: boolean
  statusLine: string | null
  repositoryCount: number
}

export type RepositoryView = {
  id: string
  connectionId: string
  fullName: string
  shortName: string
  defaultBranch: string
  usedBy: Application[]
  addedAt: string
  providerUrl: string
}

export type AvailableRepositoryView = { externalId: string; fullName: string; defaultBranch: string }

export const PROVIDER_LABEL: Record<RepoProvider, string> = {
  [RepoProvider.Github]: 'GitHub',
  [RepoProvider.Gitlab]: 'GitLab',
}

const PROVIDER_LOGO: Record<RepoProvider, ProviderId> = {
  [RepoProvider.Github]: 'github',
  [RepoProvider.Gitlab]: 'gitlab',
}

const PROVIDER_ORIGIN: Record<RepoProvider, string> = {
  [RepoProvider.Github]: 'https://github.com',
  [RepoProvider.Gitlab]: 'https://gitlab.com',
}

export const NEEDS_REAUTH_LINE = 'Needs re-auth'

export const NOT_USED_LABEL = 'Not used'

export function toGitConnection(connection: Schemas['GitConnection']): GitConnectionView {
  const needsReauth = connection.status === ConnectionStatus.Error
  return {
    id: connection.id,
    provider: connection.provider,
    logo: PROVIDER_LOGO[connection.provider],
    accountLogin: connection.account_login,
    title: `${PROVIDER_LABEL[connection.provider]} ${connection.account_login}`,
    status: connection.status,
    needsReauth,
    statusLine: needsReauth ? NEEDS_REAUTH_LINE : null,
    repositoryCount: connection.repository_count,
  }
}

export function toRepository(row: Schemas['Repository']): RepositoryView {
  return {
    id: row.id,
    connectionId: row.connection_id,
    fullName: row.full_name,
    shortName: row.full_name.slice(row.full_name.lastIndexOf('/') + 1),
    defaultBranch: row.default_branch,
    usedBy: row.used_by.map(toApplication),
    addedAt: row.created_at,
    providerUrl: `${PROVIDER_ORIGIN[row.provider]}/${row.full_name}`,
  }
}

export function toAvailableRepository(row: Schemas['AvailableRepository']): AvailableRepositoryView {
  return { externalId: row.external_id, fullName: row.full_name, defaultBranch: row.default_branch }
}

export function addRepositoriesLabel(count: number): string {
  return count === 1 ? 'Add 1 repository' : `Add ${count} repositories`
}
