export const LOGIN_WINDOW_MS = 15 * 60 * 1000

export const MAX_FAILED_ATTEMPTS = 5

export type LoginAllowance = { allowed: boolean; retryAfterSeconds: number }

export function attemptKey(email: string): string {
  return email.trim().toLowerCase()
}

// The window opens at the first failure kept and closes fifteen minutes later; failures from a closed window count for nothing.
function openWindow(attempts: Date[], now: Date): Date[] {
  const [first] = attempts
  return first !== undefined && now.getTime() - first.getTime() < LOGIN_WINDOW_MS ? attempts : []
}

export function loginAllowance(attempts: Date[], now: Date): LoginAllowance {
  const open = openWindow(attempts, now)
  if (open.length < MAX_FAILED_ATTEMPTS) return { allowed: true, retryAfterSeconds: 0 }
  return { allowed: false, retryAfterSeconds: Math.ceil((open[0].getTime() + LOGIN_WINDOW_MS - now.getTime()) / 1000) }
}

export function afterFailure(attempts: Date[], now: Date): Date[] {
  return [...openWindow(attempts, now), now]
}

// Drops a reserved attempt by reference identity, because afterFailure stores the same Date instance the caller reserved with.
export function withoutAttempt(attempts: Date[], attempt: Date): Date[] {
  return attempts.filter((kept) => kept !== attempt)
}

export function isExpired(attempts: Date[], now: Date): boolean {
  const [first] = attempts
  return first === undefined || now.getTime() - first.getTime() >= LOGIN_WINDOW_MS
}
