import { describe, expect, it } from 'vitest'
import { fillResource } from './resource'

describe('fillResource', () => {
  it('fills every route parameter the template names', () => {
    expect(
      fillResource('/organizations/:org_id/applications/:application_id/tasks/:task_id', { org_id: 'O1', application_id: 'A1', task_id: 'T1' }),
    ).toBe('/organizations/O1/applications/A1/tasks/T1')
  })
})
