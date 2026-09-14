export const UNKNOWN_REF = { code: 'unknown_ref', message: 'The repository has no branch or tag with this name' } as const

export const RELEASE_IN_FLIGHT = { code: 'release_in_flight', message: 'Wait for the release in flight to finish first' } as const

export const INSTANCE_NOT_RUNNING = { code: 'instance_not_running', message: 'This instance has expired or been torn down' } as const

export const INSTANCE_NOT_FOUND = { message: 'instance not found' } as const
