import { describe, expect, it } from 'vitest'
import { authSettingsFrom } from './settings'

describe('the auth settings', () => {
  it('marks cookies secure in production and nowhere else', () => {
    expect([authSettingsFrom({ NODE_ENV: 'production' }), authSettingsFrom({ NODE_ENV: 'development' }), authSettingsFrom({})]).toEqual([
      { secureCookies: true },
      { secureCookies: false },
      { secureCookies: false },
    ])
  })
})
