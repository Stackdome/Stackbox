export type ReconcilerSettings = {
  // Process id plus boot nonce, written to task.lease_owner.
  owner: string
  claimLimit: number
  gitHost: string
  // Short-lived read-only token for one repository, placed in the run's env for the clone.
  readToken: string
  // False keeps onApplicationBootstrap from starting the interval.
  tickEnabled: boolean
}

export const RECONCILER_SETTINGS = Symbol('ReconcilerSettings')
