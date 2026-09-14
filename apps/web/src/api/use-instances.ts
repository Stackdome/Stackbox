import { useCallback, useEffect, useState } from 'react'
import { type InstanceListQuery, fetchInstances, spinUpInstance } from './instances'
import { type InstanceView, type SpinUpDraft, toInstance, toSpinUpInput } from './mappers/instance'

export function useInstances(orgId: string | null, query: InstanceListQuery = {}) {
  const { applicationId, includeTornDown } = query
  const [instances, setInstances] = useState<InstanceView[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const refresh = useCallback(async () => {
    if (!orgId) return
    try {
      setInstances((await fetchInstances(orgId, { applicationId, includeTornDown })).items.map(toInstance))
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [orgId, applicationId, includeTornDown])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { instances, loading, failed, refresh }
}

export function useSpinUp(orgId: string | null) {
  return useCallback(
    async (draft: SpinUpDraft): Promise<string> => {
      if (!orgId) throw new Error('no organization to spin the instance up in')
      return (await spinUpInstance(orgId, toSpinUpInput(draft))).id
    },
    [orgId],
  )
}
