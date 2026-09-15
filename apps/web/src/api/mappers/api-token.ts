import { ApiTokenExpiryDays, type components } from '@stackbox/contract'

type Schemas = components['schemas']

export type ApiTokenView = { id: string; name: string; prefix: string; expiresAt: string | null; lastUsedAt: string | null; createdAt: string }

export type ApiTokenCreatedView = ApiTokenView & { secret: string }

export type TokenExpiryChoice = ApiTokenExpiryDays | null

export const NEVER_KEY = 'never'

export type TokenExpiryKey = `${ApiTokenExpiryDays}` | typeof NEVER_KEY

export type TokenDraft = { name: string; expiry: TokenExpiryChoice }

export const TOKEN_EXPIRY_CHOICES: TokenExpiryChoice[] = [ApiTokenExpiryDays.Month, ApiTokenExpiryDays.Quarter, ApiTokenExpiryDays.Year, null]

const EXPIRY_LABEL: Record<ApiTokenExpiryDays, string> = {
  [ApiTokenExpiryDays.Month]: '30 days',
  [ApiTokenExpiryDays.Quarter]: '90 days',
  [ApiTokenExpiryDays.Year]: '1 year',
}

const NEVER_LABEL = 'Never'
const DATE_FORMAT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }

export function tokenExpiryLabel(choice: TokenExpiryChoice): string {
  return choice === null ? NEVER_LABEL : EXPIRY_LABEL[choice]
}

export function tokenExpiryKeyOf(choice: TokenExpiryChoice): TokenExpiryKey {
  return choice === null ? NEVER_KEY : (`${choice}` as TokenExpiryKey)
}

export function tokenExpiryChoiceOf(key: TokenExpiryKey): TokenExpiryChoice {
  return key === NEVER_KEY ? null : (Number(key) as ApiTokenExpiryDays)
}

export function toApiToken(token: Schemas['ApiToken']): ApiTokenView {
  return { id: token.id, name: token.name, prefix: token.prefix, expiresAt: token.expires_at, lastUsedAt: token.last_used_at, createdAt: token.created_at }
}

export function toApiTokenCreated(created: Schemas['ApiTokenCreated']): ApiTokenCreatedView {
  return { ...toApiToken(created), secret: created.secret }
}

export function toApiTokenCreate(draft: TokenDraft): Schemas['ApiTokenCreate'] {
  return { name: draft.name.trim(), expires_in_days: draft.expiry }
}

export function tokenExpiryText(expiresAt: string | null, now: number): string {
  if (expiresAt === null) return NEVER_LABEL
  if (Date.parse(expiresAt) <= now) return 'Expired'
  return new Date(expiresAt).toLocaleDateString('en-US', DATE_FORMAT)
}
