import { describe, expect, it } from 'vitest'
import { InMemoryClock } from './in-memory-clock'

const START = new Date('2026-09-13T10:00:00Z')

describe('the in-memory clock', () => {
  it('moves forward by exactly the advanced milliseconds', () => {
    const clock = new InMemoryClock(START)
    clock.advance(2_000)
    expect(clock.now()).toEqual(new Date('2026-09-13T10:00:02Z'))
  })

  it('hands out a copy so a caller cannot move the clock', () => {
    const clock = new InMemoryClock(START)
    clock.now().setTime(0)
    expect(clock.now()).toEqual(START)
  })
})
