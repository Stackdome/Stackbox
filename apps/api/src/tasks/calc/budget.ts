import type { Execution } from '../types'

export function costOf(executions: readonly Pick<Execution, 'costCents'>[]): number {
  return executions.reduce((sum, execution) => sum + execution.costCents, 0)
}

export function wouldExceedBudget(input: { spent: number; taskBudgetCents: number | null; orgBudgetCents: number }): boolean {
  const overTask = input.taskBudgetCents !== null && input.spent >= input.taskBudgetCents
  // An organization budget of 0 means no organization cap.
  const overOrg = input.orgBudgetCents > 0 && input.spent >= input.orgBudgetCents
  return overTask || overOrg
}
