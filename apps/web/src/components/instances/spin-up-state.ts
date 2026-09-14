import { InstanceExpiryHours, InstancePurpose } from '@stackbox/contract'
import type { ExpiryChoice, SpinUpDraft, SpinUpPurpose } from '@/api/mappers/instance'

export type SpinUpApplication = { id: string; name: string; defaultBranch: string }

export type SpinUpInitial = { application?: SpinUpApplication; locked?: boolean; purpose?: SpinUpPurpose; ref?: string }

export type SubmitState = { status: 'idle' } | { status: 'submitting' } | { status: 'failed'; message: string }

export type SpinUpState = { draft: SpinUpDraft; submit: SubmitState; lockedApplicationId: string | null }

export type SpinUpAction =
  | { type: 'application picked'; application: SpinUpApplication }
  | { type: 'purpose picked'; purpose: SpinUpPurpose }
  | { type: 'ref changed'; ref: string }
  | { type: 'expiry picked'; expiry: ExpiryChoice }
  | { type: 'submit started' }
  | { type: 'submit failed'; message: string }

export const NO_EXPIRY = 'none'

export type ExpiryKey = `${InstanceExpiryHours}` | typeof NO_EXPIRY

export function expiryKeyOf(expiry: ExpiryChoice): ExpiryKey {
  return expiry === null ? NO_EXPIRY : (`${expiry}` as ExpiryKey)
}

export function expiryChoiceOf(key: ExpiryKey): ExpiryChoice {
  return key === NO_EXPIRY ? null : (Number(key) as InstanceExpiryHours)
}

export function defaultExpiryFor(purpose: SpinUpPurpose): ExpiryChoice {
  return purpose === InstancePurpose.Persistent ? null : InstanceExpiryHours.ThreeDays
}

export function spinUpPurposeOf(purpose: InstancePurpose): SpinUpPurpose {
  return purpose === InstancePurpose.Task ? InstancePurpose.Scratch : purpose
}

export function initialSpinUpState(initial: SpinUpInitial = {}): SpinUpState {
  const purpose = initial.purpose ?? InstancePurpose.Scratch
  return {
    draft: {
      applicationId: initial.application?.id ?? '',
      purpose,
      ref: initial.ref ?? initial.application?.defaultBranch ?? '',
      expiry: defaultExpiryFor(purpose),
    },
    submit: { status: 'idle' },
    lockedApplicationId: initial.locked ? (initial.application?.id ?? null) : null,
  }
}

export function spinUpReducer(state: SpinUpState, action: SpinUpAction): SpinUpState {
  switch (action.type) {
    case 'application picked':
      return { ...state, draft: { ...state.draft, applicationId: action.application.id, ref: action.application.defaultBranch } }
    case 'purpose picked':
      return { ...state, draft: { ...state.draft, purpose: action.purpose, expiry: defaultExpiryFor(action.purpose) } }
    case 'ref changed':
      return { ...state, draft: { ...state.draft, ref: action.ref } }
    case 'expiry picked':
      return state.draft.purpose === InstancePurpose.Persistent ? state : { ...state, draft: { ...state.draft, expiry: action.expiry } }
    case 'submit started':
      return { ...state, submit: { status: 'submitting' } }
    case 'submit failed':
      return { ...state, submit: { status: 'failed', message: action.message } }
  }
}

export function canSubmit(state: SpinUpState): boolean {
  return state.draft.applicationId !== '' && state.draft.ref.trim() !== '' && state.submit.status !== 'submitting'
}
