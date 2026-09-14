import { describe, expect, it } from 'vitest'
import { hasServicesToRun } from './spin-up'

describe('hasServicesToRun', () => {
  it('runs an application synced at some sha, even one the repository has since moved past', () => {
    expect(hasServicesToRun({ syncedAtSha: 'a1b2c3d', validationError: null })).toBe(true)
  })

  it('refuses an application that never synced', () => {
    expect(hasServicesToRun({ syncedAtSha: null, validationError: null })).toBe(false)
  })

  it('refuses an application whose last sync failed validation', () => {
    expect(hasServicesToRun({ syncedAtSha: 'a1b2c3d', validationError: 'services.api: needs a path or an image' })).toBe(false)
  })
})
