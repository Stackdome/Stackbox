import { describe, expect, it } from 'vitest'
import { FALLBACK_SLUG, slugFrom } from './slug'

describe('slugFrom', () => {
  it('lowercases a name and joins its words with hyphens', () => {
    expect(slugFrom('Acme Shop  Admin!')).toBe('acme-shop-admin')
  })

  it('trims to 63 characters without leaving a trailing hyphen', () => {
    const slug = slugFrom(`${'a'.repeat(62)} b`)

    expect([slug.length <= 63, slug.endsWith('-')]).toEqual([true, false])
  })

  it('falls back to application when the name has no letters or digits', () => {
    expect(slugFrom('!!!')).toBe(FALLBACK_SLUG)
  })
})
