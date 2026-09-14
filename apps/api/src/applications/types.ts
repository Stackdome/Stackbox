import type { ProviderRepository } from '../repositories/types'
import type { StackfileService } from './calc/stackfile'

export type ApplicationRecord = {
  id: string
  orgId: string
  name: string
  slug: string
  // Null means stackfile.yaml at the repository root.
  stackfilePath: string | null
  syncedAtSha: string | null
  validatedAt: Date | null
  validationError: string | null
  credentialsRef: Record<string, unknown>
  createdAt: Date
  repository: ProviderRepository
  serviceNames: string[]
  taskCount: number
}

export type ServiceRecord = {
  id: string
  name: string
  path: string | null
  image: string | null
  repository: { id: string; fullName: string; defaultBranch: string } | null
}

export type NewApplication = { orgId: string; name: string; slug: string; repositoryId: string; stackfilePath: string | null }

export type ApplicationPatch = { name?: string; stackfilePath?: string }

export type SyncWrite = { sha: string; validatedAt: Date; services: StackfileService[] } | { error: string }
