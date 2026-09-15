import type { OrganizationChoice } from '@/api/errors'
import type { SignInDraft } from '@/api/mappers/current-user'

export type SignInSubmit = { status: 'idle' } | { status: 'submitting' } | { status: 'failed'; message: string }

export type SignInState = { draft: SignInDraft; choices: OrganizationChoice[]; submit: SignInSubmit }

export type SignInAction =
  | { type: 'email changed'; email: string }
  | { type: 'password changed'; password: string }
  | { type: 'organization picked'; organizationId: string }
  | { type: 'submit started' }
  | { type: 'organization asked'; choices: OrganizationChoice[] }
  | { type: 'submit failed'; message: string }

export const MISSING_CREDENTIALS = 'Enter your email and password'

export const MISSING_ORGANIZATION = 'Choose the organization to sign in to'

const IDLE: SignInSubmit = { status: 'idle' }

export function initialSignInState(): SignInState {
  return { draft: { email: '', password: '', organizationId: null }, choices: [], submit: IDLE }
}

export function signInReducer(state: SignInState, action: SignInAction): SignInState {
  switch (action.type) {
    case 'email changed':
      return { draft: { ...state.draft, email: action.email, organizationId: null }, choices: [], submit: IDLE }
    case 'password changed':
      return { ...state, draft: { ...state.draft, password: action.password }, submit: IDLE }
    case 'organization picked':
      return { ...state, draft: { ...state.draft, organizationId: action.organizationId }, submit: IDLE }
    case 'submit started':
      return { ...state, submit: { status: 'submitting' } }
    case 'organization asked':
      return { ...state, draft: { ...state.draft, organizationId: null }, choices: action.choices, submit: IDLE }
    case 'submit failed':
      return { ...state, submit: { status: 'failed', message: action.message } }
  }
}

export function signInProblem(state: SignInState): string | null {
  if (state.draft.email.trim() === '' || state.draft.password === '') return MISSING_CREDENTIALS
  if (state.choices.length > 0 && state.draft.organizationId === null) return MISSING_ORGANIZATION
  return null
}
