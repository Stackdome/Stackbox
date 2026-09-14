import type { InstanceExpiryHours, components } from '@stackbox/contract'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createRelease, extendInstanceExpiry, fetchInstance, teardownInstance } from './instances'
import { type InstanceDetailView, needsPolling, toInstanceDetail } from './mappers/instance'

export const INSTANCE_DETAIL_REFRESH_MS = 2_000

export function useInstanceDetail(orgId: string | null, instanceId: string, refreshMs: number = INSTANCE_DETAIL_REFRESH_MS) {
  const [data, setData] = useState<InstanceDetailView | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  // Only the most recently started read or write may set the detail; an older poll resolving after it is dropped.
  const latestRequest = useRef(0)

  useEffect(() => {
    setData(null)
    setLoading(true)
    setFailed(false)
  }, [instanceId])

  const refresh = useCallback(async () => {
    if (!orgId) return
    const request = ++latestRequest.current
    try {
      const detail = await fetchInstance(orgId, instanceId)
      if (request !== latestRequest.current) return
      setData(toInstanceDetail(detail))
      setFailed(false)
    } catch {
      if (request !== latestRequest.current) return
      setFailed(true)
    } finally {
      if (request === latestRequest.current) setLoading(false)
    }
  }, [orgId, instanceId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const polling = data !== null && needsPolling(data)

  useEffect(() => {
    if (!polling) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, refreshMs)
    return () => window.clearInterval(timer)
  }, [polling, refresh, refreshMs])

  const settle = useCallback((detail: components['schemas']['InstanceDetail']) => {
    latestRequest.current += 1
    setData(toInstanceDetail(detail))
  }, [])

  const deploy = useCallback(async () => {
    if (!orgId) return
    await createRelease(orgId, instanceId, {})
    await refresh()
  }, [orgId, instanceId, refresh])

  const teardown = useCallback(async () => {
    if (!orgId) return
    settle(await teardownInstance(orgId, instanceId))
  }, [orgId, instanceId, settle])

  const extendExpiry = useCallback(
    async (hours: InstanceExpiryHours) => {
      if (!orgId) return
      settle(await extendInstanceExpiry(orgId, instanceId, hours))
    },
    [orgId, instanceId, settle],
  )

  return { data, loading, failed, refresh, deploy, teardown, extendExpiry }
}
