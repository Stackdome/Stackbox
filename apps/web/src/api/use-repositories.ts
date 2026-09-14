import type { RepoProvider } from '@stackbox/contract'
import { useCallback, useEffect, useState } from 'react'
import { createGitConnection, fetchAvailableRepositories, fetchGitConnections, verifyGitConnection } from './git-connections'
import { type Application, toApplication } from './mappers/application'
import {
  type AvailableRepositoryView,
  type GitConnectionView,
  type RepositoryView,
  toAvailableRepository,
  toGitConnection,
  toRepository,
} from './mappers/repository'
import { addRepositories, blockingApplicationsOf, fetchRepositories, removeRepository } from './repositories'

type Loaded = { connections: GitConnectionView[]; repositories: RepositoryView[] }

const NOTHING_LOADED: Loaded = { connections: [], repositories: [] }

export function useRepositories(orgId: string | null) {
  const [loaded, setLoaded] = useState<Loaded>(NOTHING_LOADED)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const refresh = useCallback(async () => {
    if (!orgId) return
    try {
      const [connections, repositories] = await Promise.all([fetchGitConnections(orgId), fetchRepositories(orgId)])
      setLoaded({ connections: connections.items.map(toGitConnection), repositories: repositories.items.map(toRepository) })
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const connect = useCallback(
    async (input: { provider: RepoProvider; accountLogin: string }) => {
      if (!orgId) return
      await createGitConnection(orgId, { provider: input.provider, account_login: input.accountLogin })
      await refresh()
    },
    [orgId, refresh],
  )

  const verify = useCallback(
    async (connectionId: string) => {
      if (!orgId) return
      await verifyGitConnection(orgId, connectionId)
      await refresh()
    },
    [orgId, refresh],
  )

  const available = useCallback(
    async (connectionId: string): Promise<AvailableRepositoryView[]> => {
      if (!orgId) return []
      return (await fetchAvailableRepositories(orgId, connectionId)).items.map(toAvailableRepository)
    },
    [orgId],
  )

  const add = useCallback(
    async (connectionId: string, externalIds: string[]) => {
      if (!orgId) return
      await addRepositories(orgId, { connection_id: connectionId, external_ids: externalIds })
      await refresh()
    },
    [orgId, refresh],
  )

  // Resolves to the applications that block the remove; any other failure rejects.
  const remove = useCallback(
    async (repositoryId: string): Promise<Application[] | null> => {
      if (!orgId) return null
      try {
        await removeRepository(orgId, repositoryId)
      } catch (error: unknown) {
        const blocking = blockingApplicationsOf(error)
        if (blocking === null) throw error
        return blocking.map(toApplication)
      }
      await refresh()
      return null
    },
    [orgId, refresh],
  )

  return { ...loaded, loading, failed, refresh, connect, verify, available, add, remove }
}
