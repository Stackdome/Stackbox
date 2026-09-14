import { useCallback, useEffect, useState } from 'react'
import { createApplication, detectStackfile, fetchApplications } from './applications'
import { type ApplicationListView, type DetectionView, toApplicationListItem, toDetection } from './mappers/application'

export type DetectRequest = { repositoryId: string; repositoryFullName: string; stackfilePath: string | null }

export type NewApplicationDraft = { name: string; slug: string; repositoryId: string; stackfilePath: string | null }

export function useApplications(orgId: string | null) {
  const [applications, setApplications] = useState<ApplicationListView[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const refresh = useCallback(async () => {
    if (!orgId) return
    try {
      setApplications((await fetchApplications(orgId)).items.map(toApplicationListItem))
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

  const detect = useCallback(
    async (request: DetectRequest): Promise<DetectionView> => {
      if (!orgId) throw new Error('no organization to detect the Stackfile in')
      const detection = await detectStackfile(orgId, {
        repository_id: request.repositoryId,
        ...(request.stackfilePath !== null && { stackfile_path: request.stackfilePath }),
      })
      return toDetection(detection, request.repositoryFullName)
    },
    [orgId],
  )

  const create = useCallback(
    async (draft: NewApplicationDraft): Promise<string> => {
      if (!orgId) throw new Error('no organization to create the application in')
      const created = await createApplication(orgId, {
        name: draft.name,
        slug: draft.slug,
        repository_id: draft.repositoryId,
        ...(draft.stackfilePath !== null && { stackfile_path: draft.stackfilePath }),
      })
      return created.id
    },
    [orgId],
  )

  return { applications, loading, failed, refresh, detect, create }
}
