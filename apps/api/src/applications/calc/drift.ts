import { StackfileSync } from '@stackbox/contract'

export type SyncFacts = { syncedAtSha: string | null; headSha: string; validationError: string | null }

export function syncStatus({ syncedAtSha, headSha, validationError }: SyncFacts): StackfileSync {
  if (validationError !== null) return StackfileSync.ValidationFailed
  if (syncedAtSha === null) return StackfileSync.NotSynced
  return syncedAtSha === headSha ? StackfileSync.Synced : StackfileSync.Stale
}
