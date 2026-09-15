import type { UserRole } from '@stackbox/contract'
import { useCallback, useEffect, useState } from 'react'
import { createApiToken, fetchApiTokens, revokeApiToken } from './api-tokens'
import { type ApiTokenCreatedView, type ApiTokenView, type TokenDraft, toApiToken, toApiTokenCreate, toApiTokenCreated } from './mappers/api-token'
import {
  type GeneralDraft,
  type InviteCreatedView,
  type InviteDraft,
  type InviteView,
  type MemberView,
  type OrganizationView,
  pendingInvites,
  toInvite,
  toInviteCreate,
  toInviteCreated,
  toMember,
  toOrganization,
  toOrganizationUpdate,
} from './mappers/organization'
import { createInvite, fetchInvites, fetchMembers, fetchOrganization, removeMember, revokeInvite, updateMemberRole, updateOrganization } from './organizations'

export function useOrganization(orgId: string | null) {
  const [organization, setOrganization] = useState<OrganizationView | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const refresh = useCallback(async () => {
    if (!orgId) return
    try {
      setOrganization(toOrganization(await fetchOrganization(orgId)))
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const save = useCallback(
    async (draft: GeneralDraft) => {
      if (!orgId) return
      setOrganization(toOrganization(await updateOrganization(orgId, toOrganizationUpdate(draft))))
    },
    [orgId],
  )

  return { organization, loading, failed, refresh, save }
}

export function useMembers(orgId: string | null, currentUserId: string | null) {
  const [members, setMembers] = useState<MemberView[]>([])
  const [invites, setInvites] = useState<InviteView[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const refresh = useCallback(async () => {
    if (!orgId) return
    try {
      const [memberList, inviteList] = await Promise.all([fetchMembers(orgId), fetchInvites(orgId)])
      setMembers(memberList.items.map((member) => toMember(member, currentUserId)))
      setInvites(pendingInvites(inviteList.items.map(toInvite)))
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [orgId, currentUserId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const changeRole = useCallback(
    async (userId: string, role: UserRole) => {
      if (!orgId) return
      await updateMemberRole(orgId, userId, role)
      await refresh()
    },
    [orgId, refresh],
  )

  const remove = useCallback(
    async (userId: string) => {
      if (!orgId) return
      await removeMember(orgId, userId)
      await refresh()
    },
    [orgId, refresh],
  )

  const invite = useCallback(
    async (draft: InviteDraft): Promise<InviteCreatedView> => {
      if (!orgId) throw new Error('no organization to invite into')
      const created = toInviteCreated(await createInvite(orgId, toInviteCreate(draft)), window.location.origin)
      await refresh()
      return created
    },
    [orgId, refresh],
  )

  const revoke = useCallback(
    async (inviteId: string) => {
      if (!orgId) return
      await revokeInvite(orgId, inviteId)
      await refresh()
    },
    [orgId, refresh],
  )

  return { members, invites, loading, failed, refresh, changeRole, remove, invite, revokeInvite: revoke }
}

export function useApiTokens() {
  const [tokens, setTokens] = useState<ApiTokenView[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setTokens((await fetchApiTokens()).items.map(toApiToken))
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const create = useCallback(
    async (draft: TokenDraft): Promise<ApiTokenCreatedView> => {
      const created = toApiTokenCreated(await createApiToken(toApiTokenCreate(draft)))
      await refresh()
      return created
    },
    [refresh],
  )

  const revoke = useCallback(
    async (tokenId: string) => {
      await revokeApiToken(tokenId)
      await refresh()
    },
    [refresh],
  )

  return { tokens, loading, failed, refresh, create, revoke }
}
