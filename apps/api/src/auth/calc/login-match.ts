export const LoginOutcomeKind = { Session: 'session', Choose: 'choose', Refused: 'refused' } as const

export type OrganizationChoice = { id: string; name: string }

export type LoginCandidate = { orgId: string; organizationName: string }

export type LoginOutcome<T extends LoginCandidate> =
  | { kind: typeof LoginOutcomeKind.Session; account: T }
  | { kind: typeof LoginOutcomeKind.Choose; organizations: OrganizationChoice[] }
  | { kind: typeof LoginOutcomeKind.Refused }

export function loginOutcome<T extends LoginCandidate>(matches: T[], organizationId: string | undefined): LoginOutcome<T> {
  const chosen = organizationId === undefined ? matches : matches.filter((account) => account.orgId === organizationId)
  if (chosen.length === 1) return { kind: LoginOutcomeKind.Session, account: chosen[0] }
  if (chosen.length === 0) return { kind: LoginOutcomeKind.Refused }
  return {
    kind: LoginOutcomeKind.Choose,
    organizations: chosen
      .map((account) => ({ id: account.orgId, name: account.organizationName }))
      .sort((left, right) => left.name.localeCompare(right.name)),
  }
}
