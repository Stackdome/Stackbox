import { InstanceExpiryHours, InstancePurpose } from '@stackbox/contract'
import { describe, expect, it } from 'vitest'
import { NO_EXPIRY, canSubmit, expiryChoiceOf, expiryKeyOf, initialSpinUpState, spinUpPurposeOf, spinUpReducer } from './spin-up-state'

const SHOP = { id: 'app-shop', name: 'shop', defaultBranch: 'main' }
const BILLING = { id: 'app-billing', name: 'billing', defaultBranch: 'trunk' }

describe('the spin up drawer state', () => {
  it('starts on Scratch with the 72 hour expiry and nothing picked', () => {
    expect(initialSpinUpState().draft).toEqual({ applicationId: '', purpose: InstancePurpose.Scratch, ref: '', expiry: InstanceExpiryHours.ThreeDays })
  })

  it('picks No expiry for Persistent and keeps it whatever expiry is picked after', () => {
    const persistent = spinUpReducer(initialSpinUpState(), { type: 'purpose picked', purpose: InstancePurpose.Persistent })
    const stillNone = spinUpReducer(persistent, { type: 'expiry picked', expiry: InstanceExpiryHours.Day })

    expect([persistent.draft.expiry, stillNone.draft.expiry]).toEqual([null, null])
  })

  it('returns every other purpose to the 72 hour default', () => {
    const persistent = spinUpReducer(initialSpinUpState(), { type: 'purpose picked', purpose: InstancePurpose.Persistent })
    const preview = spinUpReducer(persistent, { type: 'purpose picked', purpose: InstancePurpose.Preview })

    expect(preview.draft.expiry).toBe(InstanceExpiryHours.ThreeDays)
  })

  it('defaults the ref to the default branch of the application picked', () => {
    const picked = spinUpReducer(initialSpinUpState(), { type: 'application picked', application: BILLING })

    expect([picked.draft.applicationId, picked.draft.ref]).toEqual(['app-billing', 'trunk'])
  })

  it('starts locked to the application it was opened from', () => {
    const state = initialSpinUpState({ application: SHOP, locked: true })

    expect([state.lockedApplicationId, state.draft.applicationId, state.draft.ref]).toEqual(['app-shop', 'app-shop', 'main'])
  })

  it('prefills purpose and ref for Spin up again, reading a task instance as Scratch', () => {
    const again = initialSpinUpState({ application: SHOP, locked: true, purpose: spinUpPurposeOf(InstancePurpose.Task), ref: 'feature/checkout-v2' })

    expect([again.draft.purpose, again.draft.ref]).toEqual([InstancePurpose.Scratch, 'feature/checkout-v2'])
  })

  it('cannot submit without an application, without a ref, or while submitting', () => {
    const picked = spinUpReducer(initialSpinUpState(), { type: 'application picked', application: SHOP })
    const blankRef = spinUpReducer(picked, { type: 'ref changed', ref: '   ' })
    const submitting = spinUpReducer(picked, { type: 'submit started' })

    expect([canSubmit(initialSpinUpState()), canSubmit(blankRef), canSubmit(submitting), canSubmit(picked)]).toEqual([false, false, false, true])
  })

  it('shows a failed submit and lets the person try again', () => {
    const failed = spinUpReducer(spinUpReducer(initialSpinUpState({ application: SHOP }), { type: 'submit started' }), { type: 'submit failed', message: 'The instance was not spun up. Try again.' })

    expect([failed.submit, canSubmit(failed)]).toEqual([{ status: 'failed', message: 'The instance was not spun up. Try again.' }, true])
  })

  it('names each expiry preset by a key a segmented control can carry, and No expiry as none', () => {
    expect([expiryKeyOf(InstanceExpiryHours.Week), expiryKeyOf(null), expiryChoiceOf('24'), expiryChoiceOf(NO_EXPIRY)]).toEqual(['168', 'none', InstanceExpiryHours.Day, null])
  })
})
