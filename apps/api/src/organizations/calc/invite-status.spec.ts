import { InviteStatus } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { byPendingThenNewest, inviteExpiresAt, inviteStatusAt, isAcceptable } from './invite-status'

const NOW = new Date('2026-09-15T10:00:00Z')
const HOUR_AGO = new Date('2026-09-15T09:00:00Z')
const HOUR_AHEAD = new Date('2026-09-15T11:00:00Z')

describe('the invite status', () => {
  it('expires an invite seven days after it is sent', () => {
    expect(inviteExpiresAt(NOW)).toEqual(new Date('2026-09-22T10:00:00Z'))
  })

  it('reads a pending invite at or past its expiry as expired, and before it as pending', () => {
    expect([
      inviteStatusAt({ status: InviteStatus.Pending, expiresAt: NOW }, NOW),
      inviteStatusAt({ status: InviteStatus.Pending, expiresAt: HOUR_AHEAD }, NOW),
    ]).toEqual([InviteStatus.Expired, InviteStatus.Pending])
  })

  it('keeps an accepted or revoked invite as it was, past its expiry too', () => {
    expect([
      inviteStatusAt({ status: InviteStatus.Accepted, expiresAt: HOUR_AGO }, NOW),
      inviteStatusAt({ status: InviteStatus.Revoked, expiresAt: HOUR_AGO }, NOW),
    ]).toEqual([InviteStatus.Accepted, InviteStatus.Revoked])
  })

  it('accepts only an invite still pending before its expiry', () => {
    expect([
      isAcceptable({ status: InviteStatus.Pending, expiresAt: HOUR_AHEAD }, NOW),
      isAcceptable({ status: InviteStatus.Pending, expiresAt: HOUR_AGO }, NOW),
      isAcceptable({ status: InviteStatus.Revoked, expiresAt: HOUR_AHEAD }, NOW),
    ]).toEqual([true, false, false])
  })

  it('lists pending invites first, then the newest first', () => {
    const invites = [
      { id: 'accepted-new', status: InviteStatus.Accepted, createdAt: HOUR_AHEAD },
      { id: 'pending-old', status: InviteStatus.Pending, createdAt: HOUR_AGO },
      { id: 'pending-new', status: InviteStatus.Pending, createdAt: NOW },
      { id: 'revoked-old', status: InviteStatus.Revoked, createdAt: HOUR_AGO },
    ]

    expect([...invites].sort(byPendingThenNewest).map((invite) => invite.id)).toEqual(['pending-new', 'pending-old', 'accepted-new', 'revoked-old'])
  })
})
