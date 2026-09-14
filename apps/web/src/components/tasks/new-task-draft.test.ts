import { describe, expect, it } from 'vitest'
import { emptyDraft } from '@/api/mappers/new-task'
import { problemsOf } from './new-task-draft'

describe('the new task draft', () => {
  it('asks for an application and a description on a blank draft', () => {
    expect(Object.keys(problemsOf(emptyDraft()))).toEqual(['application', 'description'])
  })

  it('treats a description of only spaces as empty', () => {
    expect(problemsOf({ ...emptyDraft('app-shop'), description: '   ' })).toEqual({ description: 'Describe what went wrong' })
  })

  it('has nothing to say once both are filled', () => {
    expect(problemsOf({ ...emptyDraft('app-shop'), description: 'The cart badge shows zero.' })).toEqual({})
  })
})
