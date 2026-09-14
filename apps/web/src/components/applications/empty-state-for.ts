import { ROUTES } from '@/lib/routes'

export type ApplicationsEmptyState = { description: string; action: { to: string; label: string } }

export function emptyStateFor(repositoryCount: number): ApplicationsEmptyState {
  if (repositoryCount === 0) {
    return {
      description: 'An application is one repository plus its Stackfile. Connect a repository first.',
      action: { to: ROUTES.repositories, label: 'Connect a repository' },
    }
  }
  return {
    description: 'An application is one repository plus its Stackfile. Stackbox reads the Stackfile to find the services it runs.',
    action: { to: ROUTES.newApplication, label: 'Connect application' },
  }
}
