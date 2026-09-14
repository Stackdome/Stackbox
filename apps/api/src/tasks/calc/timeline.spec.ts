import { TaskEventKind } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { aTaskEvent } from '../test-support/builders'
import { timelineOf } from './timeline'

const minute = (n: number) => new Date(Date.UTC(2026, 8, 14, 10, n))

describe('the task timeline', () => {
  it('orders events by time, then by id when two land in the same instant', () => {
    const events = [aTaskEvent({ id: 'V3', at: minute(2) }), aTaskEvent({ id: 'V2', at: minute(1) }), aTaskEvent({ id: 'V1', at: minute(1) })]

    expect(timelineOf(events).map((event) => event.id)).toEqual(['V1', 'V2', 'V3'])
  })

  it('keeps one check_ignored event per agent item replayed more than once', () => {
    const events = [
      aTaskEvent({ id: 'V1', kind: TaskEventKind.CheckIgnored, payload: { itemId: 'item-4' }, at: minute(1) }),
      aTaskEvent({ id: 'V2', kind: TaskEventKind.CheckIgnored, payload: { itemId: 'item-4' }, at: minute(2) }),
      aTaskEvent({ id: 'V3', kind: TaskEventKind.CheckIgnored, payload: { itemId: 'item-5' }, at: minute(3) }),
    ]

    expect(timelineOf(events).map((event) => event.id)).toEqual(['V1', 'V3'])
  })

  it('keeps every check_ignored event that names no agent item', () => {
    const events = [
      aTaskEvent({ id: 'V1', kind: TaskEventKind.CheckIgnored, payload: { itemId: null }, at: minute(1) }),
      aTaskEvent({ id: 'V2', kind: TaskEventKind.CheckIgnored, payload: { itemId: null }, at: minute(2) }),
    ]

    expect(timelineOf(events)).toHaveLength(2)
  })

  it('keeps run boundaries and recorded checks where they happened among the phase changes', () => {
    const events = [
      aTaskEvent({ id: 'V4', kind: TaskEventKind.RunEnded, at: minute(4) }),
      aTaskEvent({ id: 'V2', kind: TaskEventKind.RunStarted, at: minute(2) }),
      aTaskEvent({ id: 'V3', kind: TaskEventKind.CheckRecorded, at: minute(3) }),
      aTaskEvent({ id: 'V1', kind: TaskEventKind.PhaseChanged, at: minute(1) }),
    ]

    expect(timelineOf(events).map((event) => event.kind)).toEqual([
      TaskEventKind.PhaseChanged,
      TaskEventKind.RunStarted,
      TaskEventKind.CheckRecorded,
      TaskEventKind.RunEnded,
    ])
  })
})
