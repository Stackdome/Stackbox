export const CONNECTION_EXISTS = { code: 'connection_exists', message: 'This provider account is already connected' } as const

export const UNKNOWN_REPOSITORY = { code: 'unknown_repository', message: 'Repository not found in this organization or provider' } as const

export const REPOSITORY_IN_USE = {
  code: 'repository_in_use',
  message: 'Disconnect the applications this repository backs before removing it',
} as const

export const CONNECTION_NOT_FOUND = { message: 'git connection not found' } as const

export const REPOSITORY_NOT_FOUND = { message: 'repository not found' } as const

export function connectionFailed(reason: string) {
  return { code: 'connection_failed', message: `The provider refused to list repositories for this account: ${reason}` } as const
}
