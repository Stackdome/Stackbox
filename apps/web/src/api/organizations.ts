import type { UserRole, components } from '@stackbox/contract'
import api from './client'

type Schemas = components['schemas']

export async function fetchOrganization(orgId: string): Promise<Schemas['Organization']> {
  const { data } = await api.get<Schemas['Organization']>(`/organizations/${orgId}`)
  return data
}

export async function updateOrganization(orgId: string, input: Schemas['OrganizationUpdate']): Promise<Schemas['Organization']> {
  const { data } = await api.patch<Schemas['Organization']>(`/organizations/${orgId}`, input)
  return data
}

export async function fetchMembers(orgId: string): Promise<Schemas['MemberList']> {
  const { data } = await api.get<Schemas['MemberList']>(`/organizations/${orgId}/users`)
  return data
}

export async function updateMemberRole(orgId: string, userId: string, role: UserRole): Promise<Schemas['Member']> {
  const { data } = await api.patch<Schemas['Member']>(`/organizations/${orgId}/users/${userId}`, { role })
  return data
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  await api.delete(`/organizations/${orgId}/users/${userId}`)
}

export async function fetchInvites(orgId: string): Promise<Schemas['InviteList']> {
  const { data } = await api.get<Schemas['InviteList']>(`/organizations/${orgId}/invites`)
  return data
}

export async function createInvite(orgId: string, input: Schemas['InviteCreate']): Promise<Schemas['InviteCreated']> {
  const { data } = await api.post<Schemas['InviteCreated']>(`/organizations/${orgId}/invites`, input)
  return data
}

export async function revokeInvite(orgId: string, inviteId: string): Promise<void> {
  await api.delete(`/organizations/${orgId}/invites/${inviteId}`)
}

export async function fetchInvitePreview(token: string): Promise<Schemas['InvitePreview']> {
  const { data } = await api.get<Schemas['InvitePreview']>(`/invites/${token}`)
  return data
}

export async function acceptInvite(token: string, input: Schemas['InviteAccept']): Promise<Schemas['Session']> {
  const { data } = await api.post<Schemas['Session']>(`/invites/${token}/accept`, input)
  return data
}
