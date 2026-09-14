import { TaskEventKind } from '@stackbox/contract'
import type { TaskEvent } from '../types'

function byTimeThenId(a: TaskEvent, b: TaskEvent): number {
  return a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id)
}

// A replayed agent item writes check_ignored again; the reviewer sees it once.
export function timelineOf(events: readonly TaskEvent[]): TaskEvent[] {
  const ignoredItems = new Set<string>()
  return [...events].sort(byTimeThenId).filter((event) => {
    const itemId = event.payload.itemId
    if (event.kind !== TaskEventKind.CheckIgnored || typeof itemId !== 'string') return true
    if (ignoredItems.has(itemId)) return false
    ignoredItems.add(itemId)
    return true
  })
}
