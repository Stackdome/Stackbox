import { describe, expect, it } from 'vitest'
import { settingsFrom } from './bindings'

describe('the reconciler bindings', () => {
  it('ticks unless RECONCILER_ENABLED is false', () => {
    expect([settingsFrom({}).tickEnabled, settingsFrom({ RECONCILER_ENABLED: 'true' }).tickEnabled, settingsFrom({ RECONCILER_ENABLED: 'false' }).tickEnabled]).toEqual([
      true,
      true,
      false,
    ])
  })
})
