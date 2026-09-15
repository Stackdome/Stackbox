import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { components } from '@stackbox/contract'
import { z } from 'zod'
import type { AuthUser } from '../access/types'
import { hashPassword } from '../auth/password'
import { hashSecret, newSecret } from '../common/secret'
import { InviteStore } from '../db/invite-store'
import { UserStore } from '../db/user-store'
import { CLOCK, type Clock } from '../ports'
import { byPendingThenNewest, inviteExpiresAt, inviteStatusAt, isAcceptable } from './calc/invite-status'
import { INVITE_NOT_PENDING, INVITE_PENDING, MEMBER_EXISTS, UNKNOWN_INVITE } from './errors'
import { presentInvite } from './presenters'
import { AcceptOutcomeKind, type UserProfile } from './types'

type Schemas = components['schemas']

const uuid = z.string().uuid()

@Injectable()
export class InviteService {
  constructor(
    @Inject(InviteStore) private readonly invites: InviteStore,
    @Inject(UserStore) private readonly users: UserStore,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async list(orgId: string): Promise<Schemas['InviteList']> {
    const now = this.clock.now()
    const invites = (await this.invites.list(orgId)).map((record) => ({ ...record, status: inviteStatusAt(record, now) }))
    return { items: invites.sort(byPendingThenNewest).map(presentInvite) }
  }

  // The raw token leaves the api once, inside this link; only its hash is kept.
  async create(orgId: string, caller: AuthUser, input: Schemas['InviteCreate']): Promise<Schemas['InviteCreated']> {
    const email = input.email.trim().toLowerCase()
    if (await this.users.isMember(orgId, email)) throw new ConflictException(MEMBER_EXISTS)
    const now = this.clock.now()
    // ponytail: the pending check reads without a lock, so two concurrent invites for one email can both land and the second to be accepted answers member_exists; a partial unique index when that matters.
    if ((await this.invites.pendingFor(orgId, email)).some((pending) => isAcceptable(pending, now))) throw new ConflictException(INVITE_PENDING)
    const token = newSecret()
    const stored = await this.invites.insert({ orgId, email, role: input.role, tokenHash: hashSecret(token), createdBy: caller.id, expiresAt: inviteExpiresAt(now) })
    return { ...presentInvite(stored), link: `/invites/${token}` }
  }

  async revoke(orgId: string, inviteId: string): Promise<void> {
    if (uuid.safeParse(inviteId).success) await this.invites.revoke(orgId, inviteId)
  }

  async preview(token: string): Promise<Schemas['InvitePreview']> {
    const record = await this.invites.findByHash(hashSecret(token))
    if (!record) throw new NotFoundException(UNKNOWN_INVITE)
    return { organization_name: record.organizationName, email: record.email, role: record.role, status: inviteStatusAt(record, this.clock.now()) }
  }

  async accept(token: string, input: Schemas['InviteAccept']): Promise<UserProfile> {
    const outcome = await this.invites.accept({
      tokenHash: hashSecret(token),
      name: input.name.trim(),
      passwordHash: await hashPassword(input.password),
      now: this.clock.now(),
    })
    switch (outcome.kind) {
      case AcceptOutcomeKind.Accepted:
        return outcome.account
      case AcceptOutcomeKind.Unknown:
        throw new NotFoundException(UNKNOWN_INVITE)
      case AcceptOutcomeKind.NotPending:
        throw new ConflictException(INVITE_NOT_PENDING)
      case AcceptOutcomeKind.MemberExists:
        throw new ConflictException(MEMBER_EXISTS)
    }
  }
}
