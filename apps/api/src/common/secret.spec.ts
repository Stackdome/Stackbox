import { describe, expect, it } from 'vitest'
import { hashSecret, newSecret, prefixOf } from './secret'

describe('secrets', () => {
  it('makes a base64url secret from 32 random bytes, a different one every time', () => {
    const [first, second] = [newSecret(), newSecret()]

    expect([first.length, /^[A-Za-z0-9_-]+$/.test(first), first === second]).toEqual([43, true, false])
  })

  it('hashes a secret to sha256 hex, the same hash for the same secret', () => {
    expect([hashSecret('abc'), hashSecret('abc') === hashSecret('abd')]).toEqual([
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      false,
    ])
  })

  it('names a secret by its first eight characters', () => {
    expect(prefixOf('sbx4Jq2pQ9rT7vW1')).toBe('sbx4Jq2p')
  })
})
