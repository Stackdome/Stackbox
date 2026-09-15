import { describe, expect, it } from 'vitest'
import { LoginOutcomeKind, loginOutcome } from './login-match'

const ACME = { id: 'U1', orgId: 'O1', organizationName: 'acme' }
const GLOBEX = { id: 'U2', orgId: 'O2', organizationName: 'globex' }

describe('the login match', () => {
  it('signs in the one account whose password matched', () => {
    expect(loginOutcome([ACME], undefined)).toEqual({ kind: LoginOutcomeKind.Session, account: ACME })
  })

  it('refuses when no account matched', () => {
    expect(loginOutcome([], undefined)).toEqual({ kind: LoginOutcomeKind.Refused })
  })

  it('asks which organization when accounts in several matched and none was named, by organization name', () => {
    expect(loginOutcome([GLOBEX, ACME], undefined)).toEqual({
      kind: LoginOutcomeKind.Choose,
      organizations: [
        { id: 'O1', name: 'acme' },
        { id: 'O2', name: 'globex' },
      ],
    })
  })

  it('signs in the account of the organization named among the matches', () => {
    expect(loginOutcome([ACME, GLOBEX], 'O2')).toEqual({ kind: LoginOutcomeKind.Session, account: GLOBEX })
  })

  it('refuses an organization that is not among the matches, even for a single match', () => {
    expect(loginOutcome([ACME], 'O2')).toEqual({ kind: LoginOutcomeKind.Refused })
  })
})
