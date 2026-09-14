import type { InstancePurpose, InstanceStatus, ReleaseStatus, TaskPhase } from '@stackbox/contract'
import type { ProviderRepository } from '../repositories/types'

export type ReleaseRecord = {
  id: string
  instanceId: string
  commitSha: string
  ref: string | null
  status: ReleaseStatus
  runNumber: number | null
  createdAt: Date
}

export type InstanceRecord = {
  id: string
  orgId: string
  application: { id: string; name: string }
  repository: ProviderRepository
  purpose: InstancePurpose
  status: InstanceStatus
  url: string | null
  owner: { id: string; name: string } | null
  task: { id: string; description: string; phase: TaskPhase } | null
  expiresAt: Date | null
  createdAt: Date
  // Newest first.
  releases: ReleaseRecord[]
}

export type NewInstance = {
  id: string
  applicationId: string
  purpose: InstancePurpose
  createdBy: string
  url: string
  expiresAt: Date | null
}

export type NewRelease = { id: string; instanceId: string; commitSha: string; ref: string; status: ReleaseStatus }
