import { ApiTokenExpiryDays } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { makeApiToken } from '../../../.storybook/fixtures'
import { NEVER_KEY, toApiToken, toApiTokenCreate, toApiTokenCreated, tokenExpiryChoiceOf, tokenExpiryKeyOf, tokenExpiryLabel, tokenExpiryText } from './api-token'

const NOW = Date.parse('2026-09-15T12:00:00Z')

describe('the api token mapper', () => {
  it('names each expiry preset and Never', () => {
    expect([ApiTokenExpiryDays.Month, ApiTokenExpiryDays.Quarter, ApiTokenExpiryDays.Year, null].map(tokenExpiryLabel)).toEqual(['30 days', '90 days', '1 year', 'Never'])
  })

  it('carries an expiry through a key a segmented control can hold', () => {
    expect([tokenExpiryKeyOf(ApiTokenExpiryDays.Year), tokenExpiryKeyOf(null), tokenExpiryChoiceOf('30'), tokenExpiryChoiceOf(NEVER_KEY)]).toEqual([
      '365',
      'never',
      ApiTokenExpiryDays.Month,
      null,
    ])
  })

  it('reads an expiry as Never, Expired or the date it ends', () => {
    expect([tokenExpiryText(null, NOW), tokenExpiryText('2026-09-15T11:00:00Z', NOW), tokenExpiryText('2026-12-14T12:00:00Z', NOW)]).toEqual([
      'Never',
      'Expired',
      'Dec 14, 2026',
    ])
  })

  it('keeps the secret only on the token just created, and trims the name it sends', () => {
    expect([
      'secret' in toApiToken(makeApiToken()),
      toApiTokenCreated({ ...makeApiToken(), secret: 'sbx4Jq2pQ9rT7vW1' }).secret,
      toApiTokenCreate({ name: ' ci ', expiry: ApiTokenExpiryDays.Quarter }),
      toApiTokenCreate({ name: 'ci', expiry: null }),
    ]).toEqual([false, 'sbx4Jq2pQ9rT7vW1', { name: 'ci', expires_in_days: ApiTokenExpiryDays.Quarter }, { name: 'ci', expires_in_days: null }])
  })
})
