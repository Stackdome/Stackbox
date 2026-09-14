import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type CheckView,
  type MessageView,
  type RunView,
  type TaskDetailView,
  type TimelineEntry,
  toCheck,
  toMessage,
  toRun,
  toTaskDetail,
  toTimelineEntry,
} from './mappers/task-detail'
import { fetchTaskChecks, fetchTaskDetail, fetchTaskEvents, fetchTaskMessages, fetchTaskRuns, replyToTask } from './tasks'

export const TASK_DETAIL_REFRESH_MS = 5_000

export type TaskDetailData = {
  detail: TaskDetailView
  timeline: TimelineEntry[]
  checks: CheckView[]
  runs: RunView[]
  messages: MessageView[]
}

export function useTaskDetail(orgId: string | null, taskId: string) {
  const [data, setData] = useState<TaskDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  // Only the most recently started request may write state; an older poll resolving after it is dropped.
  const latestRequest = useRef(0)

  useEffect(() => {
    setData(null)
    setLoading(true)
    setFailed(false)
  }, [taskId])

  const refresh = useCallback(async () => {
    if (!orgId) return
    const request = ++latestRequest.current
    try {
      const [detail, events, checks, runs, messages] = await Promise.all([
        fetchTaskDetail(orgId, taskId),
        fetchTaskEvents(orgId, taskId),
        fetchTaskChecks(orgId, taskId),
        fetchTaskRuns(orgId, taskId),
        fetchTaskMessages(orgId, taskId),
      ])
      if (request !== latestRequest.current) return
      setData({
        detail: toTaskDetail(detail, events.items),
        timeline: events.items.map(toTimelineEntry),
        checks: checks.items.map(toCheck),
        runs: runs.items.map(toRun),
        messages: messages.items.map(toMessage),
      })
      setFailed(false)
    } catch {
      if (request !== latestRequest.current) return
      setFailed(true)
    } finally {
      if (request === latestRequest.current) setLoading(false)
    }
  }, [orgId, taskId])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, TASK_DETAIL_REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [refresh])

  const reply = useCallback(
    async (body: string) => {
      if (!orgId) return
      await replyToTask(orgId, taskId, body)
      await refresh()
    },
    [orgId, taskId, refresh],
  )

  return { data, loading, failed, refresh, reply }
}
