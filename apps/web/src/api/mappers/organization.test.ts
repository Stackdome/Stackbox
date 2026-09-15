import { InviteStatus, UserRole } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { PREVIEW_ORGANIZATION, makeInvite, makeMember } from '../../../.storybook/fixtures'
import {
  generalDraftOf,
  generalDraftProblem,
  inviteDraftProblem,
  inviteExpiryText,
  isGeneralDirty,
  joinDraftProblem,
  pendingInvites,
  toInvite,
  toInviteAccept,
  toInviteCreate,
  toInviteCreated,
  toInvitePreview,
  toMember,
  toOrganization,
  toOrganizationUpdate,
} from './organization'

describe('the organization mapper', () => {
  it('reads the monthly budget in whole dollars and writes it back in cents', () => {
    const organization = toOrganization(PREVIEW_ORGANIZATION)

    expect([organization.budgetDollars, generalDraftOf(organization), toOrganizationUpdate({ name: ' acme labs ', budget: '600' })]).toEqual([
      500,
      { name: 'acme', budget: '500' },
      { name: 'acme labs', budget_cents: 60_000 },
    ])
  })

  it('knows the General form is dirty only once the name or the budget changed', () => {
    const organization = toOrganization(PREVIEW_ORGANIZATION)

    expect([
      isGeneralDirty(organization, { name: 'acme', budget: '500' }),
      isGeneralDirty(organization, { name: ' acme ', budget: '500' }),
      isGeneralDirty(organization, { name: 'acme labs', budget: '500' }),
      isGeneralDirty(organization, { name: 'acme', budget: '600' }),
    ]).toEqual([false, false, true, true])
  })

  it('names what is wrong with a blank name or a budget that is not whole dollars', () => {
    expect([
      generalDraftProblem({ name: '  ', budget: '500' }),
      generalDraftProblem({ name: 'acme', budget: '12.50' }),
      generalDraftProblem({ name: 'acme', budget: '-1' }),
      generalDraftProblem({ name: 'acme', budget: '0' }),
    ]).toEqual(['Name the organization', 'Enter the budget in whole dollars', 'Enter the budget in whole dollars', null])
  })

  it('rounds a budget stored in odd cents to whole dollars, so it opens without a problem or as dirty', () => {
    const organization = toOrganization({ ...PREVIEW_ORGANIZATION, budget_cents: 12345 })
    const draft = generalDraftOf(organization)

    expect([draft, generalDraftProblem(draft), isGeneralDirty(organization, draft)]).toEqual([{ name: 'acme', budget: '123' }, null, false])
  })

  it('refuses a budget above the integer columns maximum', () => {
    expect([generalDraftProblem({ name: 'acme', budget: '21474836' }), generalDraftProblem({ name: 'acme', budget: '21474837' })]).toEqual([
      null,
      'Enter a budget of at most $21,474,836',
    ])
  })

  it('labels a member role and marks the signed in member as you', () => {
    expect([toMember(makeMember(), 'u1'), toMember(makeMember({ id: 'u2', role: UserRole.OrgMember }), 'u1').roleLabel]).toEqual([
      { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', role: UserRole.OrgAdmin, roleLabel: 'Admin', isYou: true },
      'Member',
    ])
  })

  it('keeps only pending invites for the Pending invites section', () => {
    const invites = [makeInvite(), makeInvite({ id: 'invite-2', status: InviteStatus.Expired }), makeInvite({ id: 'invite-3', status: InviteStatus.Revoked })].map(toInvite)

    expect(pendingInvites(invites).map((invite) => invite.id)).toEqual(['invite-1'])
  })

  it('turns the invite link into an address to copy on this origin', () => {
    const created = toInviteCreated({ ...makeInvite(), link: '/invites/abc123' }, 'http://localhost:5273')

    expect(created.link).toBe('http://localhost:5273/invites/abc123')
  })

  it('names an invite email missing an @ or a domain, and accepts a valid one', () => {
    expect([inviteDraftProblem({ email: 'grace@', role: UserRole.OrgMember }), inviteDraftProblem({ email: ' grace@example.com ', role: UserRole.OrgMember })]).toEqual([
      'Enter an email address',
      null,
    ])
  })

  it('trims the email of an invite and reads a preview with its role label', () => {
    expect([
      toInviteCreate({ email: ' grace@example.com ', role: UserRole.OrgAdmin }),
      toInvitePreview({ organization_name: 'acme', email: 'grace@example.com', role: UserRole.OrgMember, status: InviteStatus.Pending }),
    ]).toEqual([
      { email: 'grace@example.com', role: UserRole.OrgAdmin },
      { organizationName: 'acme', email: 'grace@example.com', role: UserRole.OrgMember, roleLabel: 'Member', status: InviteStatus.Pending },
    ])
  })

  it('names what a Join form is missing, and trims the name it sends', () => {
    expect([
      joinDraftProblem({ name: ' ', password: 'long enough' }),
      joinDraftProblem({ name: 'Grace Hopper', password: 'short' }),
      joinDraftProblem({ name: 'Grace Hopper', password: 'long enough' }),
      toInviteAccept({ name: ' Grace Hopper ', password: 'long enough' }),
    ]).toEqual(['Enter your name', 'Use a password of at least 8 characters', null, { name: 'Grace Hopper', password: 'long enough' }])
  })

  it('reads an invite expiry as a date', () => {
    expect(inviteExpiryText('2026-09-22T12:00:00Z')).toBe('Expires Sep 22, 2026')
  })
})
