import { ConnectionStatus, StackfileSync } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { statusVariant } from './status-variant'

describe('statusVariant', () => {
  it('reads a stale Stackfile in the warn tier, a failed validation in the error tier and a never synced one as neutral', () => {
    expect(Object.values(StackfileSync).map((sync) => statusVariant('stackfile_sync', sync))).toEqual(['ready', 'pending', 'neutral', 'error'])
  })

  it('reads a refused git connection as an error and a verified one as ready', () => {
    expect([statusVariant('git_connection', ConnectionStatus.Verified), statusVariant('git_connection', ConnectionStatus.Error)]).toEqual(['ready', 'error'])
  })
})
