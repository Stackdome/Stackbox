import { CoarseStatus, ConnectionStatus, ServiceKind, StackfileSync, type components } from '@stackbox/contract'
import type { HttpHandler } from 'msw'
import { applicationHandlers } from './applications'
import { repositoryHandlers } from './repositories'

type Schemas = components['schemas']

export type RepositoryRow = Omit<Schemas['Repository'], 'used_by'>

export type CatalogSeed = {
  connections: Schemas['GitConnection'][]
  repositories: RepositoryRow[]
  catalogue: Record<string, Schemas['AvailableRepository'][]>
  applications: Schemas['ApplicationDetail'][]
  tasks: Schemas['TaskSummary'][]
}

export type CatalogOptions = { delayMs?: number; persistKey?: string }

type CatalogState = Omit<CatalogSeed, 'tasks'>

export const PREVIEW_HEAD_SHA = '9f8e7d6c5b4a39281706f5e4d3c2b1a098765432'

export const PREVIEW_DELAY_MS = 2000

const STACKFILE_NAME = 'stackfile.yaml'

const ACTIVE: CoarseStatus[] = [CoarseStatus.Running, CoarseStatus.NeedsYou]

const DETECTED: Schemas['DetectedService'][] = [
  { name: 'api', path: 'apps/api', image: null, kind: ServiceKind.Source },
  { name: 'web', path: 'apps/web', image: null, kind: ServiceKind.Source },
  { name: 'postgres', path: null, image: 'postgres:17', kind: ServiceKind.Image },
]

function byName<T extends { name: string }>(left: T, right: T): number {
  return left.name.localeCompare(right.name)
}

function detectionAt(stackfilePath: string | null): Schemas['StackfileDetection'] {
  const path = stackfilePath ?? STACKFILE_NAME
  return path.slice(path.lastIndexOf('/') + 1) === STACKFILE_NAME
    ? { sha: PREVIEW_HEAD_SHA, services: DETECTED, error: null }
    : { sha: PREVIEW_HEAD_SHA, services: [], error: `Stackfile not found at ${path}` }
}

function synced(detail: Schemas['ApplicationDetail']): Schemas['ApplicationDetail'] {
  const detection = detectionAt(detail.stackfile_path)
  if (detection.error !== null) {
    return { ...detail, sync: StackfileSync.ValidationFailed, head_sha: detection.sha, validation_error: detection.error }
  }
  return {
    ...detail,
    sync: StackfileSync.Synced,
    synced_at_sha: detection.sha,
    head_sha: detection.sha,
    validated_at: new Date().toISOString(),
    validation_error: null,
    services: detection.services.map((service) => ({
      id: `${detail.id}-${service.name}`,
      name: service.name,
      path: service.path,
      image: service.image,
      kind: service.kind,
      repository: service.path === null ? null : detail.repository,
    })),
  }
}

/** One set of handlers owns one catalog: a change lives as long as the handlers, or as long as the tab when a persist key is given. */
export class PreviewCatalog {
  private state: CatalogState
  private readonly tasks: Schemas['TaskSummary'][]
  private readonly persistKey: string | undefined

  constructor(seed: CatalogSeed, persistKey?: string) {
    const stored = persistKey ? sessionStorage.getItem(persistKey) : null
    this.state = stored
      ? (JSON.parse(stored) as CatalogState)
      : { connections: seed.connections, repositories: seed.repositories, catalogue: seed.catalogue, applications: seed.applications }
    this.tasks = seed.tasks
    this.persistKey = persistKey
  }

  connections(): Schemas['GitConnection'][] {
    return this.state.connections.map((connection) => ({
      ...connection,
      repository_count: this.state.repositories.filter((row) => row.connection_id === connection.id).length,
    }))
  }

  connect(input: Schemas['GitConnectionCreate']): Schemas['GitConnection'] | null {
    if (this.state.connections.some((connection) => connection.provider === input.provider && connection.account_login === input.account_login)) {
      return null
    }
    const id = `connection-${crypto.randomUUID()}`
    const created: Schemas['GitConnection'] = {
      id,
      provider: input.provider,
      account_login: input.account_login,
      status: ConnectionStatus.Verified,
      repository_count: 0,
      created_at: new Date().toISOString(),
    }
    this.commit({
      ...this.state,
      connections: [...this.state.connections, created],
      catalogue: {
        ...this.state.catalogue,
        [id]: ['web', 'api'].map((name) => ({ external_id: `${id}-${name}`, full_name: `${input.account_login}/${name}`, default_branch: 'main' })),
      },
    })
    return created
  }

  verify(connectionId: string): Schemas['GitConnection'] | null {
    if (!this.state.connections.some((connection) => connection.id === connectionId)) return null
    this.commit({
      ...this.state,
      connections: this.state.connections.map((connection) => (connection.id === connectionId ? { ...connection, status: ConnectionStatus.Verified } : connection)),
    })
    return this.connections().find((connection) => connection.id === connectionId) ?? null
  }

  available(connectionId: string): Schemas['AvailableRepository'][] | null {
    const catalogue = this.state.catalogue[connectionId]
    if (!catalogue) return null
    const added = new Set(this.state.repositories.filter((row) => row.connection_id === connectionId).map((row) => row.external_id))
    return catalogue.filter((entry) => !added.has(entry.external_id))
  }

  repositories(): Schemas['Repository'][] {
    return [...this.state.repositories]
      .sort((left, right) => left.full_name.localeCompare(right.full_name))
      .map((row) => ({ ...row, used_by: this.usedBy(row.id) }))
  }

  add(input: Schemas['RepositoryAdd']): Schemas['Repository'][] | null {
    const connection = this.state.connections.find((candidate) => candidate.id === input.connection_id)
    const offered = this.available(input.connection_id) ?? []
    const picked = input.external_ids.map((externalId) => offered.find((entry) => entry.external_id === externalId))
    if (!connection || !picked.every((entry): entry is Schemas['AvailableRepository'] => entry !== undefined)) return null
    const rows: RepositoryRow[] = picked.map((entry) => ({
      id: `repo-${entry.external_id}`,
      connection_id: connection.id,
      provider: connection.provider,
      external_id: entry.external_id,
      full_name: entry.full_name,
      default_branch: entry.default_branch,
      created_at: new Date().toISOString(),
    }))
    this.commit({ ...this.state, repositories: [...this.state.repositories, ...rows] })
    return rows.map((row) => ({ ...row, used_by: [] }))
  }

  hasRepository(repositoryId: string): boolean {
    return this.state.repositories.some((row) => row.id === repositoryId)
  }

  usedBy(repositoryId: string): Schemas['ApplicationSummary'][] {
    return this.state.applications
      .filter((detail) => detail.repository.id === repositoryId)
      .sort(byName)
      .map(({ id, name }) => ({ id, name }))
  }

  removeRepository(repositoryId: string): void {
    this.commit({ ...this.state, repositories: this.state.repositories.filter((row) => row.id !== repositoryId) })
  }

  applications(): Schemas['ApplicationListItem'][] {
    return [...this.state.applications].sort(byName).map((detail) => ({
      id: detail.id,
      name: detail.name,
      slug: detail.slug,
      repository: detail.repository,
      stackfile_path: detail.stackfile_path,
      sync: detail.sync,
      synced_at_sha: detail.synced_at_sha,
      service_names: detail.services.map((service) => service.name).sort(),
      task_count: this.taskCountOf(detail.id),
    }))
  }

  application(applicationId: string): Schemas['ApplicationDetail'] | null {
    const detail = this.state.applications.find((candidate) => candidate.id === applicationId)
    return detail ? { ...detail, task_count: this.taskCountOf(detail.id) } : null
  }

  detect(input: Schemas['StackfileDetect']): Schemas['StackfileDetection'] | null {
    return this.hasRepository(input.repository_id) ? detectionAt(input.stackfile_path ?? null) : null
  }

  slugTaken(slug: string): boolean {
    return this.state.applications.some((detail) => detail.slug === slug)
  }

  create(input: Schemas['ApplicationCreate'], slug: string): Schemas['ApplicationDetail'] | null {
    const repository = this.state.repositories.find((row) => row.id === input.repository_id)
    if (!repository) return null
    const created = synced({
      id: `app-${slug}`,
      name: input.name,
      slug,
      repository: { id: repository.id, full_name: repository.full_name, default_branch: repository.default_branch },
      stackfile_path: input.stackfile_path ?? null,
      sync: StackfileSync.NotSynced,
      synced_at_sha: null,
      head_sha: PREVIEW_HEAD_SHA,
      validated_at: null,
      validation_error: null,
      credentials: [],
      services: [],
      task_count: 0,
      created_at: new Date().toISOString(),
    })
    this.commit({ ...this.state, applications: [...this.state.applications, created] })
    return created
  }

  update(applicationId: string, input: Schemas['ApplicationUpdate']): Schemas['ApplicationDetail'] | null {
    const detail = this.application(applicationId)
    if (!detail) return null
    const renamed = input.name === undefined ? detail : { ...detail, name: input.name }
    const next =
      input.stackfile_path === undefined || input.stackfile_path === detail.stackfile_path ? renamed : synced({ ...renamed, stackfile_path: input.stackfile_path })
    this.replaceApplication(next)
    return next
  }

  sync(applicationId: string): Schemas['ApplicationDetail'] | null {
    const detail = this.application(applicationId)
    if (!detail) return null
    const next = synced(detail)
    this.replaceApplication(next)
    return next
  }

  hasActiveTasks(applicationId: string): boolean {
    return this.tasks.some((row) => row.application.id === applicationId && ACTIVE.includes(row.coarse_status))
  }

  removeApplication(applicationId: string): void {
    this.commit({ ...this.state, applications: this.state.applications.filter((detail) => detail.id !== applicationId) })
  }

  private replaceApplication(next: Schemas['ApplicationDetail']): void {
    this.commit({ ...this.state, applications: this.state.applications.map((detail) => (detail.id === next.id ? next : detail)) })
  }

  private taskCountOf(applicationId: string): number {
    return this.tasks.filter((row) => row.application.id === applicationId).length
  }

  private commit(next: CatalogState): void {
    this.state = next
    if (this.persistKey) sessionStorage.setItem(this.persistKey, JSON.stringify(next))
  }
}

export function catalogHandlers(seed: CatalogSeed, options: CatalogOptions = {}): HttpHandler[] {
  const catalog = new PreviewCatalog(seed, options.persistKey)
  return [...repositoryHandlers(catalog), ...applicationHandlers(catalog, options.delayMs ?? PREVIEW_DELAY_MS)]
}
