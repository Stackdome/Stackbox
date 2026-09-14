import { ServiceKind, StackfileSync, type components } from '@stackbox/contract'
import type { Task } from './task'

type Schemas = components['schemas']

export type Application = { id: string; name: string }

export function toApplication(summary: Schemas['ApplicationSummary']): Application {
  return { id: summary.id, name: summary.name }
}

export const DEFAULT_STACKFILE_PATH = 'stackfile.yaml'
export const MAX_SERVICE_CHIPS = 4
export const RECENT_TASK_COUNT = 5
export const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/

const SHORT_SHA_LENGTH = 7
const MAX_SLUG_LENGTH = 63
const FALLBACK_SLUG = 'application'

export const SERVICE_KIND_LABEL: Record<ServiceKind, string> = {
  [ServiceKind.Source]: 'Source',
  [ServiceKind.Image]: 'Image',
}

export type SyncView = { status: StackfileSync; label: string; line: string | null }

export type ServiceChipSet = { shown: string[]; more: number }

export type ApplicationListView = {
  id: string
  name: string
  slug: string
  repositoryFullName: string
  defaultBranch: string
  stackfilePath: string
  sync: SyncView
  chips: ServiceChipSet
  serviceNames: string[]
  taskCount: number
  tasksLabel: string
}

export type ServiceView = {
  id: string
  name: string
  kind: ServiceKind
  kindLabel: string
  source: string
  shortSource: string
  defaultBranch: string | null
}

export type DetectedServiceView = { name: string; kind: ServiceKind; kindLabel: string; source: string }

export type DetectionView = { sha: string; services: DetectedServiceView[]; error: string | null }

export type CredentialView = { name: string; kindLabel: string; ref: string }

export type ApplicationDetailView = {
  id: string
  name: string
  slug: string
  repository: { id: string; fullName: string; defaultBranch: string }
  stackfilePath: string
  customStackfilePath: string | null
  sync: SyncView
  syncedShaShort: string | null
  headShaShort: string
  validatedAt: string | null
  validationError: string | null
  credentials: CredentialView[]
  services: ServiceView[]
  taskCount: number
}

export function shortSha(sha: string): string {
  return sha.slice(0, SHORT_SHA_LENGTH)
}

export function slugFrom(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, '')
  return slug || FALLBACK_SLUG
}

export function syncViewOf(sync: StackfileSync, syncedAtSha: string | null): SyncView {
  switch (sync) {
    case StackfileSync.Synced:
      return { status: sync, label: 'Synced', line: null }
    case StackfileSync.Stale: {
      const line = `Not synced since ${shortSha(syncedAtSha ?? '')}`
      return { status: sync, label: line, line }
    }
    case StackfileSync.NotSynced:
      return { status: sync, label: 'Not synced', line: null }
    case StackfileSync.ValidationFailed:
      return { status: sync, label: 'Validation failed', line: null }
  }
}

export function serviceChipsOf(names: string[]): ServiceChipSet {
  return { shown: names.slice(0, MAX_SERVICE_CHIPS), more: Math.max(0, names.length - MAX_SERVICE_CHIPS) }
}

function tasksLabel(count: number): string {
  return count === 1 ? '1 task' : `${count} tasks`
}

function sourceOf(service: { path: string | null; image: string | null }, repositoryFullName: string | null): string {
  return service.path !== null && repositoryFullName !== null ? `${repositoryFullName}/${service.path}` : (service.image ?? '')
}

function kindLabelOf(kind: string): string {
  const words = kind.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function toApplicationListItem(item: Schemas['ApplicationListItem']): ApplicationListView {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    repositoryFullName: item.repository.full_name,
    defaultBranch: item.repository.default_branch,
    stackfilePath: item.stackfile_path ?? DEFAULT_STACKFILE_PATH,
    sync: syncViewOf(item.sync, item.synced_at_sha),
    chips: serviceChipsOf(item.service_names),
    serviceNames: item.service_names,
    taskCount: item.task_count,
    tasksLabel: tasksLabel(item.task_count),
  }
}

export function toService(service: Schemas['Service']): ServiceView {
  const fullName = service.repository?.full_name ?? null
  return {
    id: service.id,
    name: service.name,
    kind: service.kind,
    kindLabel: SERVICE_KIND_LABEL[service.kind],
    source: sourceOf(service, fullName),
    shortSource: service.path !== null && fullName !== null ? fullName.slice(fullName.lastIndexOf('/') + 1) : (service.image ?? ''),
    defaultBranch: service.repository?.default_branch ?? null,
  }
}

export function toDetection(detection: Schemas['StackfileDetection'], repositoryFullName: string): DetectionView {
  return {
    sha: detection.sha,
    error: detection.error,
    services: detection.services.map((service) => ({
      name: service.name,
      kind: service.kind,
      kindLabel: SERVICE_KIND_LABEL[service.kind],
      source: sourceOf(service, repositoryFullName),
    })),
  }
}

export function toApplicationDetail(detail: Schemas['ApplicationDetail']): ApplicationDetailView {
  return {
    id: detail.id,
    name: detail.name,
    slug: detail.slug,
    repository: { id: detail.repository.id, fullName: detail.repository.full_name, defaultBranch: detail.repository.default_branch },
    stackfilePath: detail.stackfile_path ?? DEFAULT_STACKFILE_PATH,
    customStackfilePath: detail.stackfile_path,
    sync: syncViewOf(detail.sync, detail.synced_at_sha),
    syncedShaShort: detail.synced_at_sha === null ? null : shortSha(detail.synced_at_sha),
    headShaShort: shortSha(detail.head_sha),
    validatedAt: detail.validated_at,
    validationError: detail.validation_error,
    credentials: detail.credentials.map((credential) => ({ name: credential.name, kindLabel: kindLabelOf(credential.kind), ref: credential.ref })),
    services: detail.services.map(toService),
    taskCount: detail.task_count,
  }
}

export function recentTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((left, right) => right.at.localeCompare(left.at)).slice(0, RECENT_TASK_COUNT)
}
