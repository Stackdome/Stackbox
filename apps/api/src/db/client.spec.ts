import { describe, it, expect } from 'vitest'
import { createDb, requireDatabaseUrl } from './client'

describe('requireDatabaseUrl', () => {
  it('refuses to start without DATABASE_URL', () => {
    expect(() => requireDatabaseUrl(undefined)).toThrow('DATABASE_URL is required')
    expect(() => requireDatabaseUrl('')).toThrow('DATABASE_URL is required')
  })
})

describe('createDb', () => {
  it('refuses to start without DATABASE_URL', () => {
    expect(() => createDb(undefined)).toThrow('DATABASE_URL is required')
  })
})
