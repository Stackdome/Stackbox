import { expect, test } from '@playwright/test'
import { ApiTokenExpiryDays, InviteStatus, UserRole, type components } from '@stackbox/contract'
import { orgPath, signIn } from './support'

type Schemas = components['schemas']

const ADMIN = { email: 'ada@example.com', password: 'password' }
const VIEWER_EMAIL = 'vik@example.com'
const INVITEE = { email: 'grace@example.com', password: 'a long enough password' }
const REVOKED_EMAIL = 'hopper@example.com'
const SEED_ORGANIZATION = { name: 'acme', budget_cents: 50_000 }

const tokenOf = (link: string) => link.slice(link.lastIndexOf('/') + 1)

test.describe.configure({ mode: 'serial' })

let inviteLink = ''

test('an admin renames the organization and changes its budget, and a blank name answers 400', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)

  const renamed = await admin.api.patch(orgPath(admin, ''), { data: { name: 'acme labs' } })
  const budgeted = await admin.api.patch(orgPath(admin, ''), { data: { budget_cents: 60_000 } })
  const blank = await admin.api.patch(orgPath(admin, ''), { data: { name: '   ' } })
  const read: Schemas['Organization'] = await (await admin.api.get(orgPath(admin, ''))).json()
  await admin.api.patch(orgPath(admin, ''), { data: SEED_ORGANIZATION })

  expect([renamed.status(), budgeted.status(), blank.status(), read.name, read.budget_cents]).toEqual([200, 200, 400, 'acme labs', 60_000])
})

test('an admin invites an email, which previews as pending and joins signed in', async ({ playwright, baseURL, request }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)

  const created = await admin.api.post(orgPath(admin, '/invites'), { data: { email: INVITEE.email, role: UserRole.OrgMember } })
  const invite: Schemas['InviteCreated'] = await created.json()
  inviteLink = invite.link
  const preview: Schemas['InvitePreview'] = await (await request.get(`/api/v1/invites/${tokenOf(invite.link)}`)).json()
  const accepted = await request.post(`/api/v1/invites/${tokenOf(invite.link)}/accept`, { data: { name: 'Grace Hopper', password: INVITEE.password } })
  const session: Schemas['Session'] = await accepted.json()
  const signedIn = await signIn(playwright, baseURL, INVITEE)

  expect([created.status(), invite.status, preview.status, accepted.status(), session.user.role, signedIn.user.email]).toEqual([
    201,
    InviteStatus.Pending,
    InviteStatus.Pending,
    200,
    UserRole.OrgMember,
    INVITEE.email,
  ])
})

test('accepting the same invite again answers 409 invite_not_pending', async ({ request }) => {
  const again = await request.post(`/api/v1/invites/${tokenOf(inviteLink)}/accept`, { data: { name: 'Grace Hopper', password: INVITEE.password } })

  expect([again.status(), (await again.json()).code]).toEqual([409, 'invite_not_pending'])
})

test('inviting an email that is already a member answers 409 member_exists', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)

  const refused = await admin.api.post(orgPath(admin, '/invites'), { data: { email: VIEWER_EMAIL, role: UserRole.OrgMember } })

  expect([refused.status(), (await refused.json()).code]).toEqual([409, 'member_exists'])
})

test('revoking an invite answers 204 twice and the invite previews as revoked', async ({ playwright, baseURL, request }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const invite: Schemas['InviteCreated'] = await (await admin.api.post(orgPath(admin, '/invites'), { data: { email: REVOKED_EMAIL, role: UserRole.OrgMember } })).json()

  const first = await admin.api.delete(orgPath(admin, `/invites/${invite.id}`))
  const second = await admin.api.delete(orgPath(admin, `/invites/${invite.id}`))
  const preview: Schemas['InvitePreview'] = await (await request.get(`/api/v1/invites/${tokenOf(invite.link)}`)).json()

  expect([first.status(), second.status(), preview.status]).toEqual([204, 204, InviteStatus.Revoked])
})

test('the only admin cannot demote themself; once the invitee is an admin, the refusal is about their own account', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const members: Schemas['MemberList'] = await (await admin.api.get(orgPath(admin, '/users'))).json()
  const grace = members.items.filter((member) => member.email === INVITEE.email)[0]

  const lastAdmin = await admin.api.patch(orgPath(admin, `/users/${admin.user.id}`), { data: { role: UserRole.OrgMember } })
  const promoted = await admin.api.patch(orgPath(admin, `/users/${grace.id}`), { data: { role: UserRole.OrgAdmin } })
  const ownAccount = await admin.api.patch(orgPath(admin, `/users/${admin.user.id}`), { data: { role: UserRole.OrgMember } })

  expect([lastAdmin.status(), (await lastAdmin.json()).code, promoted.status(), (await promoted.json()).role, ownAccount.status(), (await ownAccount.json()).code]).toEqual([
    409,
    'last_admin',
    200,
    UserRole.OrgAdmin,
    409,
    'own_account',
  ])
})

test('removing the invitee answers 204 twice and their session stops answering', async ({ playwright, baseURL }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const grace = await signIn(playwright, baseURL, INVITEE)

  const first = await admin.api.delete(orgPath(admin, `/users/${grace.user.id}`))
  const second = await admin.api.delete(orgPath(admin, `/users/${grace.user.id}`))
  const current = await grace.api.get('/api/v1/users/current')

  expect([first.status(), second.status(), current.status()]).toEqual([204, 204, 401])
})

test('an api token answers as its user until it is revoked, and its secret is never listed', async ({ playwright, baseURL, request }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)

  const created = await admin.api.post('/api/v1/api-tokens', { data: { name: 'e2e token', expires_in_days: ApiTokenExpiryDays.Month } })
  const token: Schemas['ApiTokenCreated'] = await created.json()
  const bearer = { Authorization: `Bearer ${token.secret}` }
  const asToken: Schemas['CurrentUser'] = await (await request.get('/api/v1/users/current', { headers: bearer })).json()
  const listed = await (await admin.api.get('/api/v1/api-tokens')).text()
  const revoked = await admin.api.delete(`/api/v1/api-tokens/${token.id}`)
  const afterRevoke = await request.get('/api/v1/users/current', { headers: bearer })

  expect([created.status(), asToken.email, listed.includes(token.prefix), listed.includes(token.secret), revoked.status(), afterRevoke.status()]).toEqual([
    201,
    ADMIN.email,
    true,
    false,
    204,
    401,
  ])
})

test('an api token cannot mint an invite link', async ({ playwright, baseURL, request }) => {
  const admin = await signIn(playwright, baseURL, ADMIN)
  const created = await admin.api.post('/api/v1/api-tokens', { data: { name: 'invite attempt', expires_in_days: ApiTokenExpiryDays.Month } })
  const token: Schemas['ApiTokenCreated'] = await created.json()

  const response = await request.post(orgPath(admin, '/invites'), {
    headers: { Authorization: `Bearer ${token.secret}` },
    data: { email: 'attacker@example.com', role: UserRole.OrgAdmin },
  })
  const body: { code: string } = await response.json()

  expect([response.status(), body.code]).toEqual([401, 'invalid_session'])
})
