// @vitest-environment jsdom
import { InviteStatus, UserRole } from '@stackbox/contract'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ORG_ID, PREVIEW_ACCOUNTS_SEED, PREVIEW_INVITE_TOKEN, PREVIEW_PASSWORD } from '../../../.storybook/fixtures'
import { PreviewAccounts, accountHandlers, sessionGate } from './accounts'

const PERSIST_KEY = 'stackbox.preview.catalog.v3.test.accounts'

describe('the preview accounts', () => {
  beforeEach(() => sessionStorage.clear())

  it('starts signed in as the fixture admin', () => {
    expect(new PreviewAccounts(PREVIEW_ACCOUNTS_SEED).signedIn()?.email).toBe('ada@example.com')
  })

  it('signs in the fixture admin and the fixture member with the fixture password, and refuses a wrong one', () => {
    const accounts = new PreviewAccounts(PREVIEW_ACCOUNTS_SEED)

    expect([
      accounts.signIn({ email: 'ADA@example.com', password: PREVIEW_PASSWORD })?.user.role,
      accounts.signIn({ email: 'vik@example.com', password: PREVIEW_PASSWORD })?.user.role,
      accounts.signIn({ email: 'vik@example.com', password: 'not the password' }),
    ]).toEqual([UserRole.OrgAdmin, UserRole.OrgMember, null])
  })

  it('keeps a sign out under the v3 key, so the tab stays signed out after a reload', () => {
    new PreviewAccounts(PREVIEW_ACCOUNTS_SEED, PERSIST_KEY).signOut()

    expect(new PreviewAccounts(PREVIEW_ACCOUNTS_SEED, PERSIST_KEY).signedIn()).toBeNull()
  })

  it('refuses to demote the last admin, and refuses a change to your own role once another admin exists', () => {
    const accounts = new PreviewAccounts(PREVIEW_ACCOUNTS_SEED)

    const lastAdmin = accounts.changeRole('u1', UserRole.OrgMember)
    accounts.changeRole('u2', UserRole.OrgAdmin)
    const ownAccount = accounts.changeRole('u1', UserRole.OrgMember)

    expect([lastAdmin, ownAccount]).toEqual([
      { status: 409, body: { code: 'last_admin', message: 'Make another member an admin first' } },
      { status: 409, body: { code: 'own_account', message: 'Ask another admin to change your own membership' } },
    ])
  })

  it('joins through an invite token as the invited member and signs the new member in', () => {
    const accounts = new PreviewAccounts(PREVIEW_ACCOUNTS_SEED)

    const joined = accounts.accept(PREVIEW_INVITE_TOKEN, { name: 'Grace Hopper', password: 'a long enough password' })

    expect([
      joined !== null && 'user' in joined && joined.user.email,
      accounts.signedIn()?.email,
      accounts.preview(PREVIEW_INVITE_TOKEN)?.status,
      accounts.accept(PREVIEW_INVITE_TOKEN, { name: 'Grace Hopper', password: 'a long enough password' }),
    ]).toEqual([
      'grace@example.com',
      'grace@example.com',
      InviteStatus.Accepted,
      { status: 409, body: { code: 'invite_not_pending', message: 'This invite was already accepted, revoked or has expired' } },
    ])
  })

  it('shows a new token secret once and lists the token by its prefix', () => {
    const accounts = new PreviewAccounts(PREVIEW_ACCOUNTS_SEED)

    const created = accounts.createApiToken({ name: 'deploy bot' })

    expect([created.secret.startsWith(created.prefix), accounts.apiTokens().map((token) => token.name), JSON.stringify(accounts.apiTokens()).includes(created.secret)]).toEqual([
      true,
      ['deploy bot', 'CI deploys'],
      false,
    ])
  })
})

describe('the preview session gate', () => {
  const accounts = new PreviewAccounts(PREVIEW_ACCOUNTS_SEED)
  const server = setupServer(sessionGate(accounts), ...accountHandlers(accounts))

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())

  it('answers 401 to an organization request once signed out, while sign in still answers', async () => {
    accounts.signOut()

    const organization = await fetch(`/api/v1/organizations/${ORG_ID}`)
    const signIn = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'ada@example.com', password: PREVIEW_PASSWORD }),
    })
    const again = await fetch(`/api/v1/organizations/${ORG_ID}`)

    expect([organization.status, signIn.status, again.status]).toEqual([401, 200, 200])
  })
})
