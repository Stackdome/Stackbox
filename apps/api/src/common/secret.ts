import { createHash, randomBytes } from 'node:crypto'

const SECRET_BYTES = 32

export const SECRET_PREFIX_LENGTH = 8

export function newSecret(): string {
  return randomBytes(SECRET_BYTES).toString('base64url')
}

export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex')
}

export function prefixOf(secret: string): string {
  return secret.slice(0, SECRET_PREFIX_LENGTH)
}
