export type ApiTokenRecord = {
  id: string
  userId: string
  orgId: string
  name: string
  prefix: string
  expiresAt: Date | null
  lastUsedAt: Date | null
  revokedAt: Date | null
  createdAt: Date
}

export type NewApiToken = { userId: string; orgId: string; name: string; tokenHash: string; prefix: string; expiresAt: Date | null }
