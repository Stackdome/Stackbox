import type { components } from '@stackbox/contract'
import { syncStatus } from './calc/drift'
import { type ParsedStackfile, serviceKindOf } from './calc/stackfile'
import type { ApplicationRecord, ServiceRecord } from './types'

type Schemas = components['schemas']

type CredentialEntry = { kind: string; ref: string }

function presentRepositoryRef(repository: { id: string; fullName: string; defaultBranch: string }): Schemas['RepositoryRef'] {
  return { id: repository.id, full_name: repository.fullName, default_branch: repository.defaultBranch }
}

function syncOf(record: ApplicationRecord, headSha: string) {
  return syncStatus({ syncedAtSha: record.syncedAtSha, headSha, validationError: record.validationError })
}

export function presentCredentials(credentialsRef: Record<string, unknown>): Schemas['CredentialRef'][] {
  return Object.entries(credentialsRef)
    .map(([name, entry]) => {
      const { kind, ref } = entry as CredentialEntry
      return { name, kind, ref }
    })
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function presentService(service: ServiceRecord): Schemas['Service'] {
  return {
    id: service.id,
    name: service.name,
    path: service.path,
    image: service.image,
    kind: serviceKindOf(service),
    repository: service.repository && presentRepositoryRef(service.repository),
  }
}

export function presentListItem(record: ApplicationRecord, headSha: string): Schemas['ApplicationListItem'] {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    repository: presentRepositoryRef(record.repository),
    stackfile_path: record.stackfilePath,
    sync: syncOf(record, headSha),
    synced_at_sha: record.syncedAtSha,
    service_names: record.serviceNames,
    task_count: record.taskCount,
  }
}

export function presentDetail(record: ApplicationRecord, services: ServiceRecord[], headSha: string): Schemas['ApplicationDetail'] {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    repository: presentRepositoryRef(record.repository),
    stackfile_path: record.stackfilePath,
    sync: syncOf(record, headSha),
    synced_at_sha: record.syncedAtSha,
    head_sha: headSha,
    validated_at: record.validatedAt?.toISOString() ?? null,
    validation_error: record.validationError,
    credentials: presentCredentials(record.credentialsRef),
    services: services.map(presentService),
    task_count: record.taskCount,
    created_at: record.createdAt.toISOString(),
  }
}

export function presentDetection(sha: string, outcome: ParsedStackfile): Schemas['StackfileDetection'] {
  if ('error' in outcome) {
    return { sha, services: [], error: outcome.error }
  }
  return {
    sha,
    services: outcome.services.map((detected) => ({ name: detected.name, path: detected.path, image: detected.image, kind: serviceKindOf(detected) })),
    error: null,
  }
}
