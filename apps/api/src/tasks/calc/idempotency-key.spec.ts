import { describe, expect, it } from 'vitest'
import { messageKey, reproKey, runKey, verifyKey } from './idempotency-key'

describe('idempotency keys', () => {
  it('keys the reproduction run by task', () => {
    expect(reproKey('T1')).toBe('T1:repro')
  })

  it('keys an implementation run by task and run number', () => {
    expect(runKey('T1', 2)).toBe('T1:run2')
  })

  it('keys a verification run under its implementation run', () => {
    expect(verifyKey('T1', 1)).toBe('T1:run1:verify')
  })

  it('keys a reply by its message id so a replay never sends it twice', () => {
    expect(messageKey('T1', 'M2')).toBe('T1:msg:M2')
  })
})
