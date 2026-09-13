import type { Clock } from '../ports'

export class InMemoryClock implements Clock {
  private current: number

  constructor(start: Date) {
    this.current = start.getTime()
  }

  now(): Date {
    return new Date(this.current)
  }

  advance(ms: number): void {
    this.current += ms
  }
}
