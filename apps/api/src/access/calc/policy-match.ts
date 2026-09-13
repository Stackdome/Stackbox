import type { AccessRequest, Policy, RoleBinding } from '../types'

export const SCOPE_TOKEN = '{scope}'

export function patternMatches(pattern: string, resource: string): boolean {
  const wanted = pattern.split('/').filter(Boolean)
  const actual = resource.split('/').filter(Boolean)
  for (let index = 0; index < wanted.length; index++) {
    if (wanted[index] === '**') {
      return true
    }
    if (index >= actual.length || (wanted[index] !== '*' && wanted[index] !== actual[index])) {
      return false
    }
  }
  return wanted.length === actual.length
}

export function isAllowed(bindings: RoleBinding[], policies: Policy[], request: AccessRequest): boolean {
  return bindings.some((binding) =>
    policies.some(
      (candidate) =>
        candidate.orgId === request.orgId &&
        candidate.subject === binding.subject &&
        candidate.action === request.action &&
        patternMatches(candidate.resource.replace(SCOPE_TOKEN, binding.scope), request.resource),
    ),
  )
}
