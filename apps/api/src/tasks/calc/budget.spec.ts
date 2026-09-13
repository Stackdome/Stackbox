import { describe, expect, it } from 'vitest'
import { anExecution } from '../test-support/builders'
import { costOf, wouldExceedBudget } from './budget'

describe('budget', () => {
  it('sums the cost of every execution', () => {
    expect(costOf([anExecution({ costCents: 120 }), anExecution({ id: 'E2', costCents: 80 })])).toBe(200)
  })

  it('allows a run while spending stays under the organization budget', () => {
    expect(wouldExceedBudget({ spent: 9_999, taskBudgetCents: null, orgBudgetCents: 10_000 })).toBe(false)
  })

  it('refuses a run once spending reaches the organization budget', () => {
    expect(wouldExceedBudget({ spent: 10_000, taskBudgetCents: null, orgBudgetCents: 10_000 })).toBe(true)
  })

  it('refuses a run once spending reaches a task budget set below the organization budget', () => {
    expect(wouldExceedBudget({ spent: 500, taskBudgetCents: 500, orgBudgetCents: 10_000 })).toBe(true)
  })

  it('allows any spend when the organization has no budget cap', () => {
    expect(wouldExceedBudget({ spent: 1_000_000, taskBudgetCents: null, orgBudgetCents: 0 })).toBe(false)
  })
})
