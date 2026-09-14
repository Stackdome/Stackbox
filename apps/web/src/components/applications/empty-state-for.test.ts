import { describe, expect, it } from 'vitest'
import { ROUTES } from '@/lib/routes'
import { emptyStateFor } from './empty-state-for'

describe('emptyStateFor', () => {
  it('points at the Repositories page when the organisation has no repositories', () => {
    expect(emptyStateFor(0)).toEqual({
      description: 'An application is one repository plus its Stackfile. Connect a repository first.',
      action: { to: ROUTES.repositories, label: 'Connect a repository' },
    })
  })

  it('offers to connect an application once a repository exists', () => {
    expect(emptyStateFor(1)).toEqual({
      description: 'An application is one repository plus its Stackfile. Stackbox reads the Stackfile to find the services it runs.',
      action: { to: ROUTES.newApplication, label: 'Connect application' },
    })
  })
})
