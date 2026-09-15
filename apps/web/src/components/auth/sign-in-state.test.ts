import { describe, expect, it } from 'vitest'
import { MISSING_CREDENTIALS, MISSING_ORGANIZATION, type SignInAction, initialSignInState, signInProblem, signInReducer } from './sign-in-state'

const CHOICES = [
  { id: 'org-1', name: 'acme' },
  { id: 'org-2', name: 'globex' },
]

const TYPED_IN: SignInAction[] = [
  { type: 'email changed', email: 'ada@example.com' },
  { type: 'password changed', password: 'password' },
]

const filled = () => TYPED_IN.reduce(signInReducer, initialSignInState())

describe('the sign in form state', () => {
  it('starts blank with no organization to choose', () => {
    expect(initialSignInState()).toEqual({ draft: { email: '', password: '', organizationId: null }, choices: [], submit: { status: 'idle' } })
  })

  it('names missing credentials before anything is sent', () => {
    expect([signInProblem(initialSignInState()), signInProblem(filled())]).toEqual([MISSING_CREDENTIALS, null])
  })

  it('asks for an organization once the api names several, keeping the password as typed', () => {
    const asked = signInReducer(signInReducer(filled(), { type: 'submit started' }), { type: 'organization asked', choices: CHOICES })

    expect([asked.choices, asked.draft.password, asked.submit, signInProblem(asked)]).toEqual([CHOICES, 'password', { status: 'idle' }, MISSING_ORGANIZATION])
  })

  it('sends the organization picked', () => {
    const picked = signInReducer(signInReducer(filled(), { type: 'organization asked', choices: CHOICES }), { type: 'organization picked', organizationId: 'org-2' })

    expect([picked.draft.organizationId, signInProblem(picked)]).toEqual(['org-2', null])
  })

  it('forgets the organizations offered once the email changes', () => {
    const asked = signInReducer(filled(), { type: 'organization asked', choices: CHOICES })

    const changed = signInReducer(asked, { type: 'email changed', email: 'vik@example.com' })

    expect([changed.choices, changed.draft.organizationId]).toEqual([[], null])
  })

  it('clears a refusal once the person types again', () => {
    const failed = signInReducer(filled(), { type: 'submit failed', message: 'The email or password is not right' })

    expect(signInReducer(failed, { type: 'password changed', password: 'another' }).submit).toEqual({ status: 'idle' })
  })
})
