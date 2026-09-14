import { InstanceExpiryHours, InstancePurpose } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { DEFAULT_EXPIRY_HOURS, expiresAtFor, hoursAfter } from './expiry'

const NOW = new Date('2026-09-14T10:00:00Z')

describe('expiresAtFor', () => {
  it('gives a persistent instance no expiry whatever the body asked for', () => {
    expect(expiresAtFor(InstancePurpose.Persistent, InstanceExpiryHours.Day, NOW)).toBeNull()
  })

  it('defaults every other purpose to 72 hours from now when the body names no preset', () => {
    const expiries = [InstancePurpose.Scratch, InstancePurpose.Preview, InstancePurpose.LoadTest].map((purpose) => expiresAtFor(purpose, undefined, NOW))

    expect(expiries.map((expiry) => expiry?.toISOString())).toEqual(Array(3).fill('2026-09-17T10:00:00.000Z'))
  })

  it('reads a null preset as the 72 hour default for a purpose that expires', () => {
    expect(expiresAtFor(InstancePurpose.Scratch, null, NOW)).toEqual(hoursAfter(NOW, DEFAULT_EXPIRY_HOURS))
  })

  it('honours the preset the body names', () => {
    expect(expiresAtFor(InstancePurpose.Preview, InstanceExpiryHours.Week, NOW)?.toISOString()).toBe('2026-09-21T10:00:00.000Z')
  })
})
