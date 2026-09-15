import { describe, expect, it } from 'vitest'
import { CredentialKind, credentialFromHeaders } from './token-from-headers'

describe('credentialFromHeaders', () => {
  it('reads a Bearer value as an api token, ahead of the auth_token cookie', () => {
    expect(credentialFromHeaders({ authorization: 'Bearer sbx4Jq2pQ9rT7vW1', cookie: 'auth_token=from-cookie' })).toEqual({
      kind: CredentialKind.ApiToken,
      secret: 'sbx4Jq2pQ9rT7vW1',
    })
  })

  it('reads the auth_token cookie as a session when no Bearer is sent', () => {
    expect(credentialFromHeaders({ cookie: 'sidebar_state=true; auth_token=header.payload.signature' })).toEqual({
      kind: CredentialKind.Session,
      token: 'header.payload.signature',
    })
  })

  it('finds no credential when neither is sent', () => {
    expect(credentialFromHeaders({ cookie: 'refresh_token=only-the-refresh' })).toBeNull()
  })
})
