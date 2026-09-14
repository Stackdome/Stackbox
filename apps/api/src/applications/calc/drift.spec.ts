import { StackfileSync } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { syncStatus } from './drift'

const HEAD = 'b2c3d4e5f60718293a4b5c6d7e8f901234567890'

describe('syncStatus', () => {
  it('marks an application stale when the repository head moves past synced_at_sha', () => {
    expect(syncStatus({ syncedAtSha: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678', headSha: HEAD, validationError: null })).toBe(StackfileSync.Stale)
  })

  it('reads synced when the synced sha is the repository head', () => {
    expect(syncStatus({ syncedAtSha: HEAD, headSha: HEAD, validationError: null })).toBe(StackfileSync.Synced)
  })

  it('reads not_synced when the application was never synced', () => {
    expect(syncStatus({ syncedAtSha: null, headSha: HEAD, validationError: null })).toBe(StackfileSync.NotSynced)
  })

  it('reads validation_failed whenever the last sync left an error, even at the head', () => {
    expect(syncStatus({ syncedAtSha: HEAD, headSha: HEAD, validationError: 'Stackfile not found at stackfile.yaml' })).toBe(StackfileSync.ValidationFailed)
  })
})
