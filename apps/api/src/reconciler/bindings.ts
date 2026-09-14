import { randomUUID } from 'node:crypto'
import type { ReconcilerSettings } from './settings'

export function settingsFrom(env: NodeJS.ProcessEnv): ReconcilerSettings {
  return {
    owner: `${process.pid}:${randomUUID()}`,
    claimLimit: 10,
    gitHost: 'github.com',
    readToken: env.GIT_READ_TOKEN ?? 'scripted-read-token',
    tickEnabled: env.RECONCILER_ENABLED !== 'false',
  }
}
