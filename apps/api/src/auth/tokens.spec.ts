import { UserRole } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { ACCESS_TOKEN_SECONDS, Tokens, requireJwtSecret } from './tokens'

const SECRET = 'a-test-secret-that-is-long-enough-for-hs256'
const ADA = { id: 'U1', orgId: 'O1', email: 'ada@example.com', orgRole: UserRole.OrgAdmin }

describe('tokens', () => {
  it('reads the user back from an access token it issued', async () => {
    const tokens = new Tokens(SECRET)

    const { token } = await tokens.issue(ADA)

    expect(await tokens.verifyAccess(token)).toEqual(ADA)
  })

  it('refuses a refresh token where an access token is expected', async () => {
    const tokens = new Tokens(SECRET)

    const { refreshToken } = await tokens.issue(ADA)

    await expect(tokens.verifyAccess(refreshToken)).rejects.toThrow()
  })

  it('refuses an access token once fifteen minutes have passed', async () => {
    let now = new Date('2026-09-14T10:00:00Z')
    const tokens = new Tokens(SECRET, () => now)
    const { token } = await tokens.issue(ADA)

    now = new Date(now.getTime() + (ACCESS_TOKEN_SECONDS + 1) * 1000)

    await expect(tokens.verifyAccess(token)).rejects.toThrow()
  })

  it('issues a different refresh token on every rotation', async () => {
    const tokens = new Tokens(SECRET)

    const [first, second] = await Promise.all([tokens.issue(ADA), tokens.issue(ADA)])

    expect(first.refreshToken).not.toBe(second.refreshToken)
  })

  it('refuses a signing secret shorter than 32 characters', () => {
    expect(() => requireJwtSecret('short')).toThrow(/JWT_SECRET/)
  })
})
