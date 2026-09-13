import { describe, expect, it } from 'vitest'
import { tokenFromHeaders } from './token-from-headers'

describe('tokenFromHeaders', () => {
  it('prefers the Bearer header over the auth_token cookie', () => {
    expect(tokenFromHeaders({ authorization: 'Bearer from-header', cookie: 'auth_token=from-cookie' })).toBe('from-header')
  })

  it('reads the auth_token cookie when no Bearer header is sent', () => {
    expect(tokenFromHeaders({ cookie: 'sidebar_state=true; auth_token=from-cookie' })).toBe('from-cookie')
  })

  it('finds no token when neither is sent', () => {
    expect(tokenFromHeaders({})).toBeNull()
  })
})
