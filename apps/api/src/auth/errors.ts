export const INVALID_CREDENTIALS = { code: 'invalid_credentials', message: 'The email or password is not right' } as const

export const CHOOSE_ORGANIZATION = { code: 'choose_organization', message: 'Choose the organization to sign in to' } as const

export const TOO_MANY_ATTEMPTS = { code: 'too_many_attempts', message: 'Too many sign in attempts. Try again later.' } as const

export const INVALID_REFRESH = { code: 'invalid_refresh', message: 'Sign in again' } as const

export const INVALID_SESSION = { code: 'invalid_session', message: 'auth token is invalid' } as const
