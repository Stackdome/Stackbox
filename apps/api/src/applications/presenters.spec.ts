import { ServiceKind, StackfileSync } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { presentCredentials, presentDetection, presentDetail } from './presenters'
import { aServiceRecord, anApplicationRecord } from './test-support/builders'

describe('the application presenters', () => {
  it('projects credentials_ref into name, kind and ref rows ordered by name', () => {
    const credentials = presentCredentials({
      stripe: { kind: 'token', ref: 'vault://acme/stripe' },
      smtp: { kind: 'username_password', ref: 'vault://acme/smtp' },
    })

    expect(credentials).toEqual([
      { name: 'smtp', kind: 'username_password', ref: 'vault://acme/smtp' },
      { name: 'stripe', kind: 'token', ref: 'vault://acme/stripe' },
    ])
  })

  it('answers a detection error with no services', () => {
    expect(presentDetection('origin-sha', { error: 'Stackfile not found at stackfile.yaml' })).toEqual({
      sha: 'origin-sha',
      services: [],
      error: 'Stackfile not found at stackfile.yaml',
    })
  })

  it('gives an image service no repository and reads the detail stale against a moved head', () => {
    const detail = presentDetail(
      anApplicationRecord({ syncedAtSha: 'origin-sha' }),
      [aServiceRecord({ name: 'postgres', path: null, image: 'postgres:17', repository: null })],
      'moved-sha',
    )

    expect({ sync: detail.sync, head: detail.head_sha, service: [detail.services[0].kind, detail.services[0].repository] }).toEqual({
      sync: StackfileSync.Stale,
      head: 'moved-sha',
      service: [ServiceKind.Image, null],
    })
  })
})
