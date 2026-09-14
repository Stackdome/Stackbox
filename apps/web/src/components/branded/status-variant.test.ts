import { ConnectionStatus, InstanceStatus, ReleaseStatus, StackfileSync } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { statusVariant } from './status-variant'

describe('statusVariant', () => {
  it('reads a stale Stackfile in the warn tier, a failed validation in the error tier and a never synced one as neutral', () => {
    expect(Object.values(StackfileSync).map((sync) => statusVariant('stackfile_sync', sync))).toEqual(['ready', 'pending', 'neutral', 'error'])
  })

  it('reads a refused git connection as an error and a verified one as ready', () => {
    expect([statusVariant('git_connection', ConnectionStatus.Verified), statusVariant('git_connection', ConnectionStatus.Error)]).toEqual(['ready', 'error'])
  })

  it('reads an instance provisioning as info, ready as ready, degraded in the warn tier and expired or torn down as neutral', () => {
    expect(Object.values(InstanceStatus).map((status) => statusVariant('instance', status))).toEqual(['info', 'ready', 'pending', 'neutral', 'neutral'])
  })

  it('reads a release queued as neutral, building as info, live as ready and failed as an error', () => {
    expect(Object.values(ReleaseStatus).map((status) => statusVariant('release', status))).toEqual(['neutral', 'info', 'ready', 'error'])
  })
})
