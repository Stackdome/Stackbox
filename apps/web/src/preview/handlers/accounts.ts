import { InviteStatus, UserRole, type components } from '@stackbox/contract'
import { http, HttpResponse, type HttpHandler } from 'msw'
import type { Refusal } from './catalog'

type Schemas = components['schemas']

export type PreviewAccount = { member: Schemas['Member']; password: string }

export type AccountsSeed = {
  organization: Schemas['Organization']
  accounts: PreviewAccount[]
  invites: Schemas['Invite'][]
  /** Raw invite token to invite id, so a seeded invite link opens in the preview. */
  inviteTokens: Record<string, string>
  apiTokens: Schemas['ApiToken'][]
}

type AccountsState = AccountsSeed & { sessionUserId: string | null; revokedApiTokenIds: string[] }

const ORG = '*/api/v1/organizations/:orgId'
const DAY_MS = 24 * 60 * 60 * 1000
const INVITE_LIFETIME_DAYS = 7
const SECRET_PREFIX_LENGTH = 8
const MIN_PASSWORD_LENGTH = 8

const INVALID_CREDENTIALS = { code: 'invalid_credentials', message: 'The email or password is not right' }
const INVALID_REFRESH = { code: 'invalid_refresh', message: 'Sign in again' }
const INVALID_SESSION = { code: 'invalid_session', message: 'auth token is invalid' }
const LAST_ADMIN = { code: 'last_admin', message: 'Make another member an admin first' }
const OWN_ACCOUNT = { code: 'own_account', message: 'Ask another admin to change your own membership' }
const MEMBER_EXISTS = { code: 'member_exists', message: 'This email is already a member of the organization' }
const INVITE_PENDING = { code: 'invite_pending', message: 'This email already has a pending invite' }
const INVITE_NOT_PENDING = { code: 'invite_not_pending', message: 'This invite was already accepted, revoked or has expired' }
const UNKNOWN_INVITE = { code: 'unknown_invite', message: 'This invite link does not match any invite' }
const API_TOKEN_NOT_FOUND = { code: 'api_token_not_found', message: 'API token not found' }
// The integer column backing `budget_cents` tops out at 2^31 - 1.
const MAX_BUDGET_CENTS = 2147483647
const VALIDATION_FAILED = { message: 'validation failed' }
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FORBIDDEN = { code: 'forbidden', message: "You do not have permission to change this organization's settings" }

// Sign in, refresh and the two invite routes answer without a session, as the api does.
const PUBLIC_API = [/\/api\/v1\/auth\/(login|refresh)$/, /\/api\/v1\/invites\/[^/]+(\/accept)?$/]

const refusal = (status: number, body: Refusal['body']): Refusal => ({ status, body })

const sameEmail = (left: string, right: string) => left.trim().toLowerCase() === right.trim().toLowerCase()

function byName(left: Schemas['Member'], right: Schemas['Member']): number {
  return left.name.localeCompare(right.name)
}

function isPending(invite: Schemas['Invite']): boolean {
  return invite.status === InviteStatus.Pending && Date.parse(invite.expires_at) > Date.now()
}

/** The accounts side of the preview, beside the catalog: who is signed in, the organization, its members, invites and tokens. */
export class PreviewAccounts {
  private state: AccountsState

  constructor(
    seed: AccountsSeed,
    private readonly persistKey?: string,
  ) {
    const admin = seed.accounts.find((account) => account.member.role === UserRole.OrgAdmin)
    const seeded = { ...seed, sessionUserId: admin?.member.id ?? null, revokedApiTokenIds: [] }
    this.state = (persistKey ? readStored(persistKey) : null) ?? seeded
  }

  signedIn(): Schemas['CurrentUser'] | null {
    const account = this.state.accounts.find((candidate) => candidate.member.id === this.state.sessionUserId)
    return account ? this.currentUserOf(account.member) : null
  }

  signIn(input: Schemas['LoginRequest']): Schemas['Session'] | null {
    const account = this.state.accounts.find((candidate) => sameEmail(candidate.member.email, input.email) && candidate.password === input.password)
    if (!account) return null
    this.commit({ ...this.state, sessionUserId: account.member.id })
    return { user: this.currentUserOf(account.member) }
  }

  signOut(): void {
    this.commit({ ...this.state, sessionUserId: null })
  }

  organization(): Schemas['Organization'] {
    return this.state.organization
  }

  updateOrganization(input: Schemas['OrganizationUpdate']): Schemas['Organization'] | Refusal {
    if (!this.isOrgAdmin()) return refusal(403, FORBIDDEN)
    const blankName = input.name !== undefined && !input.name.trim()
    const negativeBudget = input.budget_cents !== undefined && input.budget_cents < 0
    const budgetTooLarge = input.budget_cents !== undefined && input.budget_cents > MAX_BUDGET_CENTS
    if (blankName || negativeBudget || budgetTooLarge) return refusal(400, VALIDATION_FAILED)
    const organization = { ...this.state.organization, ...(input.name !== undefined && { name: input.name.trim() }), ...(input.budget_cents !== undefined && { budget_cents: input.budget_cents }) }
    this.commit({ ...this.state, organization })
    return organization
  }

  members(): Schemas['Member'][] {
    return this.state.accounts.map((account) => account.member).sort(byName)
  }

  changeRole(userId: string, role: UserRole): Schemas['Member'] | Refusal | null {
    if (!this.isOrgAdmin()) return refusal(403, FORBIDDEN)
    const target = this.state.accounts.find((account) => account.member.id === userId)
    if (!target) return null
    if (role !== UserRole.OrgAdmin && this.isLastAdmin(target.member)) return refusal(409, LAST_ADMIN)
    if (userId === this.state.sessionUserId) return refusal(409, OWN_ACCOUNT)
    const member = { ...target.member, role }
    this.commit({ ...this.state, accounts: this.state.accounts.map((account) => (account.member.id === userId ? { ...account, member } : account)) })
    return member
  }

  removeMember(userId: string): Refusal | null {
    if (!this.isOrgAdmin()) return refusal(403, FORBIDDEN)
    const target = this.state.accounts.find((account) => account.member.id === userId)
    if (!target) return null
    if (this.isLastAdmin(target.member)) return refusal(409, LAST_ADMIN)
    if (userId === this.state.sessionUserId) return refusal(409, OWN_ACCOUNT)
    this.commit({ ...this.state, accounts: this.state.accounts.filter((account) => account.member.id !== userId) })
    return null
  }

  invites(): Schemas['Invite'][] {
    return this.state.invites.map((invite) => (invite.status === InviteStatus.Pending && !isPending(invite) ? { ...invite, status: InviteStatus.Expired } : invite))
  }

  invite(input: Schemas['InviteCreate']): Schemas['InviteCreated'] | Refusal {
    if (!this.isOrgAdmin()) return refusal(403, FORBIDDEN)
    if (!EMAIL_SHAPE.test(input.email.trim())) return refusal(400, VALIDATION_FAILED)
    if (this.state.accounts.some((account) => sameEmail(account.member.email, input.email))) return refusal(409, MEMBER_EXISTS)
    if (this.state.invites.some((invite) => sameEmail(invite.email, input.email) && isPending(invite))) return refusal(409, INVITE_PENDING)
    const token = crypto.randomUUID()
    const created: Schemas['Invite'] = {
      id: `invite-${crypto.randomUUID()}`,
      email: input.email.trim().toLowerCase(),
      role: input.role,
      status: InviteStatus.Pending,
      expires_at: new Date(Date.now() + INVITE_LIFETIME_DAYS * DAY_MS).toISOString(),
      created_at: new Date().toISOString(),
    }
    this.commit({ ...this.state, invites: [created, ...this.state.invites], inviteTokens: { ...this.state.inviteTokens, [token]: created.id } })
    return { ...created, link: `/invites/${token}` }
  }

  revokeInvite(inviteId: string): Refusal | null {
    if (!this.isOrgAdmin()) return refusal(403, FORBIDDEN)
    this.commit({
      ...this.state,
      invites: this.state.invites.map((invite) => (invite.id === inviteId && isPending(invite) ? { ...invite, status: InviteStatus.Revoked } : invite)),
    })
    return null
  }

  preview(token: string): Schemas['InvitePreview'] | null {
    const invite = this.inviteOfToken(token)
    return invite ? { organization_name: this.state.organization.name, email: invite.email, role: invite.role, status: invite.status } : null
  }

  accept(token: string, input: Schemas['InviteAccept']): Schemas['Session'] | Refusal | null {
    if (!input.name.trim() || input.password.length < MIN_PASSWORD_LENGTH) return refusal(400, VALIDATION_FAILED)
    const invite = this.inviteOfToken(token)
    if (!invite) return null
    if (invite.status !== InviteStatus.Pending) return refusal(409, INVITE_NOT_PENDING)
    if (this.state.accounts.some((account) => sameEmail(account.member.email, invite.email))) return refusal(409, MEMBER_EXISTS)
    const member: Schemas['Member'] = { id: `user-${crypto.randomUUID()}`, name: input.name.trim(), email: invite.email, role: invite.role, created_at: new Date().toISOString() }
    this.commit({
      ...this.state,
      accounts: [...this.state.accounts, { member, password: input.password }],
      invites: this.state.invites.map((candidate) => (candidate.id === invite.id ? { ...candidate, status: InviteStatus.Accepted } : candidate)),
      sessionUserId: member.id,
    })
    return { user: this.currentUserOf(member) }
  }

  apiTokens(): Schemas['ApiToken'][] {
    return this.state.apiTokens.filter((token) => !this.state.revokedApiTokenIds.includes(token.id))
  }

  createApiToken(input: Schemas['ApiTokenCreate']): Schemas['ApiTokenCreated'] {
    const secret = `sbx${crypto.randomUUID().split('-').join('')}`
    const created: Schemas['ApiToken'] = {
      id: `token-${crypto.randomUUID()}`,
      name: input.name.trim(),
      prefix: secret.slice(0, SECRET_PREFIX_LENGTH),
      expires_at: input.expires_in_days ? new Date(Date.now() + input.expires_in_days * DAY_MS).toISOString() : null,
      last_used_at: null,
      created_at: new Date().toISOString(),
    }
    this.commit({ ...this.state, apiTokens: [created, ...this.state.apiTokens] })
    return { ...created, secret }
  }

  revokeApiToken(tokenId: string): boolean {
    if (this.state.revokedApiTokenIds.includes(tokenId)) return true
    if (!this.state.apiTokens.some((token) => token.id === tokenId)) return false
    this.commit({ ...this.state, revokedApiTokenIds: [...this.state.revokedApiTokenIds, tokenId] })
    return true
  }

  private inviteOfToken(token: string): Schemas['Invite'] | null {
    const inviteId = this.state.inviteTokens[token]
    return this.invites().find((invite) => invite.id === inviteId) ?? null
  }

  private isOrgAdmin(): boolean {
    return this.signedIn()?.role === UserRole.OrgAdmin
  }

  private isLastAdmin(member: Schemas['Member']): boolean {
    return member.role === UserRole.OrgAdmin && this.state.accounts.filter((account) => account.member.role === UserRole.OrgAdmin).length === 1
  }

  private currentUserOf(member: Schemas['Member']): Schemas['CurrentUser'] {
    return { id: member.id, name: member.name, email: member.email, role: member.role, organization: { id: this.state.organization.id, name: this.state.organization.name } }
  }

  private commit(next: AccountsState): void {
    this.state = next
    if (!this.persistKey) return
    try {
      sessionStorage.setItem(this.persistKey, JSON.stringify(next))
    } catch {
      // A remembered session is a convenience; losing it is not a failure worth surfacing.
    }
  }
}

function readStored(persistKey: string): AccountsState | null {
  try {
    const stored = sessionStorage.getItem(persistKey)
    return stored ? (JSON.parse(stored) as AccountsState) : null
  } catch {
    return null
  }
}

function answer(result: object | null, okStatus = 200, missing: Refusal['body'] = UNKNOWN_INVITE) {
  if (result === null) return HttpResponse.json(missing, { status: 404 })
  if ('body' in result && 'status' in result) {
    const refused = result as Refusal
    return HttpResponse.json(refused.body, { status: refused.status })
  }
  return HttpResponse.json(result, { status: okStatus })
}

export function sessionGate(accounts: PreviewAccounts): HttpHandler {
  return http.all('*/api/v1/*', ({ request }) => {
    const { pathname } = new URL(request.url)
    if (accounts.signedIn() !== null || PUBLIC_API.some((pattern) => pattern.test(pathname))) return undefined
    return HttpResponse.json(INVALID_SESSION, { status: 401 })
  })
}

export function accountHandlers(accounts: PreviewAccounts): HttpHandler[] {
  const noContent = () => new HttpResponse(null, { status: 204 })
  return [
    http.post('*/api/v1/auth/login', async ({ request }) => {
      const session = accounts.signIn((await request.json()) as Schemas['LoginRequest'])
      return session ? HttpResponse.json(session) : HttpResponse.json(INVALID_CREDENTIALS, { status: 401 })
    }),
    http.post('*/api/v1/auth/refresh', () => {
      const user = accounts.signedIn()
      return user ? HttpResponse.json({ user }) : HttpResponse.json(INVALID_REFRESH, { status: 401 })
    }),
    http.post('*/api/v1/auth/logout', () => {
      accounts.signOut()
      return noContent()
    }),
    http.get('*/api/v1/users/current', () => HttpResponse.json(accounts.signedIn())),

    http.get(ORG, () => HttpResponse.json(accounts.organization())),
    http.patch(ORG, async ({ request }) => answer(accounts.updateOrganization((await request.json()) as Schemas['OrganizationUpdate']))),
    http.get(`${ORG}/users`, () => HttpResponse.json({ items: accounts.members() })),
    http.patch(`${ORG}/users/:userId`, async ({ params, request }) => {
      const { role } = (await request.json()) as Schemas['MemberUpdate']
      return answer(accounts.changeRole(String(params.userId), role), 200, { code: 'member_not_found', message: 'member not found' })
    }),
    http.delete(`${ORG}/users/:userId`, ({ params }) => {
      const refused = accounts.removeMember(String(params.userId))
      return refused ? HttpResponse.json(refused.body, { status: refused.status }) : noContent()
    }),
    http.get(`${ORG}/invites`, () => HttpResponse.json({ items: accounts.invites() })),
    http.post(`${ORG}/invites`, async ({ request }) => answer(accounts.invite((await request.json()) as Schemas['InviteCreate']), 201)),
    http.delete(`${ORG}/invites/:inviteId`, ({ params }) => {
      const refused = accounts.revokeInvite(String(params.inviteId))
      return refused ? HttpResponse.json(refused.body, { status: refused.status }) : noContent()
    }),

    http.get('*/api/v1/invites/:token', ({ params }) => answer(accounts.preview(String(params.token)))),
    http.post('*/api/v1/invites/:token/accept', async ({ params, request }) =>
      answer(accounts.accept(String(params.token), (await request.json()) as Schemas['InviteAccept'])),
    ),

    http.get('*/api/v1/api-tokens', () => HttpResponse.json({ items: accounts.apiTokens() })),
    http.post('*/api/v1/api-tokens', async ({ request }) => HttpResponse.json(accounts.createApiToken((await request.json()) as Schemas['ApiTokenCreate']), { status: 201 })),
    http.delete('*/api/v1/api-tokens/:tokenId', ({ params }) =>
      accounts.revokeApiToken(String(params.tokenId)) ? noContent() : HttpResponse.json(API_TOKEN_NOT_FOUND, { status: 404 }),
    ),
  ]
}
