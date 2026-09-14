import { useCallback, useEffect, useState } from 'react'
import { deleteApplication, fetchApplication, syncApplication, updateApplication } from './applications'
import { type ApplicationDetailView, toApplicationDetail } from './mappers/application'
import { type Task, toTask } from './mappers/task'
import { fetchTasks } from './tasks'

export type ApplicationDetailData = { detail: ApplicationDetailView; tasks: Task[] }

export function useApplicationDetail(orgId: string | null, applicationId: string) {
  const [data, setData] = useState<ApplicationDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(async () => {
    if (!orgId) return
    try {
      const [detail, tasks] = await Promise.all([fetchApplication(orgId, applicationId), fetchTasks(orgId, { applicationId })])
      setData({ detail: toApplicationDetail(detail), tasks: tasks.items.map(toTask) })
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [orgId, applicationId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const rename = useCallback(
    async (name: string) => {
      if (!orgId) return
      await updateApplication(orgId, applicationId, { name })
      await refresh()
    },
    [orgId, applicationId, refresh],
  )

  const setStackfilePath = useCallback(
    async (stackfilePath: string) => {
      if (!orgId) return
      await updateApplication(orgId, applicationId, { stackfile_path: stackfilePath })
      await refresh()
    },
    [orgId, applicationId, refresh],
  )

  const sync = useCallback(async () => {
    if (!orgId) return
    setSyncing(true)
    try {
      await syncApplication(orgId, applicationId)
      await refresh()
    } finally {
      setSyncing(false)
    }
  }, [orgId, applicationId, refresh])

  const remove = useCallback(async () => {
    if (!orgId) return
    await deleteApplication(orgId, applicationId)
  }, [orgId, applicationId])

  return { data, loading, failed, syncing, refresh, rename, setStackfilePath, sync, remove }
}
