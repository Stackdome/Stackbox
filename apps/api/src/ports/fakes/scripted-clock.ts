import type { Clock } from '../ports'

export class ScriptedClock implements Clock {
  now(): Date {
    return new Date()
  }
}
