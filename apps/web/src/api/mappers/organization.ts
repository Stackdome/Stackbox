import { InviteStatus, UserRole, type components } from '@stackbox/contract'

type Schemas = components['schemas']

export type OrganizationView = { id: string; name: string; budgetDollars: number; createdAt: string }

export type GeneralDraft = { name: string; budget: string }

export type MemberView = { id: string; name: string; email: string; role: UserRole; roleLabel: string; isYou: boolean }

export type InviteView = { id: string; email: string; role: UserRole; roleLabel: string; status: InviteStatus; expiresAt: string; createdAt: string }

export type InviteCreatedView = InviteView & { link: string }

export type InvitePreviewView = { organizationName: string; email: string; role: UserRole; roleLabel: string; status: InviteStatus }

export type InviteDraft = { email: string; role: UserRole }

export type JoinDraft = { name: string; password: string }

export const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.OrgAdmin]: 'Admin',
  [UserRole.OrgMember]: 'Member',
}

export const ROLES: UserRole[] = [UserRole.OrgMember, UserRole.OrgAdmin]

export const MIN_PASSWORD_LENGTH = 8

export const INVITE_UNAVAILABLE_TEXT: Record<InviteStatus, string> = {
  [InviteStatus.Pending]: '',
  [InviteStatus.Accepted]: 'This invite was already accepted. Sign in instead.',
  [InviteStatus.Revoked]: 'This invite was revoked. Ask an admin of the organization for a new one.',
  [InviteStatus.Expired]: 'This invite has expired. Ask an admin of the organization for a new one.',
}

const CENTS_PER_DOLLAR = 100
const WHOLE_DOLLARS = /^\d+$/
const DATE_FORMAT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }
// The integer column backing `budget_cents` tops out at 2^31 - 1; a dollar figure past that overflows Postgres.
const MAX_BUDGET_CENTS = 2147483647
const MAX_BUDGET_DOLLARS = Math.floor(MAX_BUDGET_CENTS / CENTS_PER_DOLLAR)

export function toOrganization(organization: Schemas['Organization']): OrganizationView {
  return { id: organization.id, name: organization.name, budgetDollars: organization.budget_cents / CENTS_PER_DOLLAR, createdAt: organization.created_at }
}

export function generalDraftOf(organization: OrganizationView): GeneralDraft {
  return { name: organization.name, budget: String(organization.budgetDollars) }
}

export function generalDraftProblem(draft: GeneralDraft): string | null {
  if (draft.name.trim() === '') return 'Name the organization'
  if (!WHOLE_DOLLARS.test(draft.budget.trim())) return 'Enter the budget in whole dollars'
  if (Number(draft.budget.trim()) > MAX_BUDGET_DOLLARS) return 'Enter a budget of at most $21,474,836'
  return null
}

export function isGeneralDirty(organization: OrganizationView, draft: GeneralDraft): boolean {
  return draft.name.trim() !== organization.name || draft.budget.trim() !== String(organization.budgetDollars)
}

export function toOrganizationUpdate(draft: GeneralDraft): Schemas['OrganizationUpdate'] {
  return { name: draft.name.trim(), budget_cents: Number(draft.budget.trim()) * CENTS_PER_DOLLAR }
}

export function toMember(member: Schemas['Member'], currentUserId: string | null): MemberView {
  return { id: member.id, name: member.name, email: member.email, role: member.role, roleLabel: ROLE_LABEL[member.role], isYou: member.id === currentUserId }
}

export function toInvite(invite: Schemas['Invite']): InviteView {
  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    roleLabel: ROLE_LABEL[invite.role],
    status: invite.status,
    expiresAt: invite.expires_at,
    createdAt: invite.created_at,
  }
}

export function pendingInvites(invites: InviteView[]): InviteView[] {
  return invites.filter((invite) => invite.status === InviteStatus.Pending)
}

export function toInviteCreated(created: Schemas['InviteCreated'], origin: string): InviteCreatedView {
  return { ...toInvite(created), link: `${origin}${created.link}` }
}

export function toInvitePreview(preview: Schemas['InvitePreview']): InvitePreviewView {
  return { organizationName: preview.organization_name, email: preview.email, role: preview.role, roleLabel: ROLE_LABEL[preview.role], status: preview.status }
}

export function toInviteCreate(draft: InviteDraft): Schemas['InviteCreate'] {
  return { email: draft.email.trim(), role: draft.role }
}

export function joinDraftProblem(draft: JoinDraft): string | null {
  if (draft.name.trim() === '') return 'Enter your name'
  if (draft.password.length < MIN_PASSWORD_LENGTH) return `Use a password of at least ${MIN_PASSWORD_LENGTH} characters`
  return null
}

export function toInviteAccept(draft: JoinDraft): Schemas['InviteAccept'] {
  return { name: draft.name.trim(), password: draft.password }
}

export function inviteExpiryText(expiresAt: string): string {
  return `Expires ${new Date(expiresAt).toLocaleDateString('en-US', DATE_FORMAT)}`
}
