import { InviteStatus } from '@stackbox/contract'

const DAY_MS = 24 * 60 * 60 * 1000

export const INVITE_LIFETIME_DAYS = 7

export function inviteExpiresAt(now: Date): Date {
  return new Date(now.getTime() + INVITE_LIFETIME_DAYS * DAY_MS)
}

// Expired is never stored: a pending row past its expiry reads as expired.
export function inviteStatusAt(invite: { status: InviteStatus; expiresAt: Date }, now: Date): InviteStatus {
  return invite.status === InviteStatus.Pending && invite.expiresAt.getTime() <= now.getTime() ? InviteStatus.Expired : invite.status
}

export function isAcceptable(invite: { status: InviteStatus; expiresAt: Date }, now: Date): boolean {
  return inviteStatusAt(invite, now) === InviteStatus.Pending
}

export function byPendingThenNewest<T extends { status: InviteStatus; createdAt: Date }>(left: T, right: T): number {
  const pendingFirst = Number(right.status === InviteStatus.Pending) - Number(left.status === InviteStatus.Pending)
  return pendingFirst !== 0 ? pendingFirst : right.createdAt.getTime() - left.createdAt.getTime()
}
