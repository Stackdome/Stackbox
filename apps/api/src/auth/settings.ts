export type AuthSettings = { secureCookies: boolean }

export const AUTH_SETTINGS = Symbol('AuthSettings')

export function authSettingsFrom(env: NodeJS.ProcessEnv): AuthSettings {
  return { secureCookies: env.NODE_ENV === 'production' }
}
