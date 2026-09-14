import {
  CoarseStatus,
  ConnectionStatus,
  InstanceExpiryHours,
  InstancePurpose,
  InstanceStatus,
  ReleaseStatus,
  ServiceKind,
  StackfileSync,
  type components,
} from '@stackbox/contract'
import type { HttpHandler } from 'msw'
import { applicationHandlers } from './applications'
import { instanceHandlers } from './instances'
import { repositoryHandlers } from './repositories'
import { PreviewTaskBook } from './task-detail'

type Schemas = components['schemas']

export type RepositoryRow = Omit<Schemas['Repository'], 'used_by'>

export type CatalogSeed = {
  connections: Schemas['GitConnection'][]
  repositories: RepositoryRow[]
  catalogue: Record<string, Schemas['AvailableRepository'][]>
  applications: Schemas['ApplicationDetail'][]
  tasks: Schemas['TaskSummary'][]
  instances?: Schemas['InstanceDetail'][]
}

/**
 * `taskBook` shares one task book with the task handlers; omitted, the catalog keeps its own built from `seed.tasks`.
 * `releaseWalkMs` is when a release the catalog created turns building, then live.
 */
export type CatalogOptions = { delayMs?: number; persistKey?: string; taskBook?: PreviewTaskBook; releaseWalkMs?: readonly [number, number] }

type CatalogState = Omit<CatalogSeed, 'tasks' | 'instances'> & { instances: Schemas['InstanceDetail'][] }

export type Refusal = { status: number; body: { code: string; message: string } }

/** The signed-in preview user, who owns every instance spun up in the preview. */
export const PREVIEW_OWNER: Schemas['InstanceOwner'] = { id: 'u1', name: 'Ada Lovelace' }

export const RELEASE_WALK_MS: readonly [number, number] = [1_000, 3_000]

const HOUR_MS = 3_600_000
const URL_ID_LENGTH = 8
const RUNNING: InstanceStatus[] = [InstanceStatus.Provisioning, InstanceStatus.Ready, InstanceStatus.Degraded]
const IN_FLIGHT: ReleaseStatus[] = [ReleaseStatus.Queued, ReleaseStatus.Building]
const NOT_SYNCED: StackfileSync[] = [StackfileSync.NotSynced, StackfileSync.ValidationFailed]

const PURPOSE_RESERVED = { code: 'purpose_reserved', message: 'Tasks create their own instances' }
const UNKNOWN_APPLICATION = { code: 'unknown_application', message: 'application not found' }
const APPLICATION_NOT_SYNCED = { code: 'application_not_synced', message: "Sync the application's Stackfile before spinning up an instance" }
const RELEASE_IN_FLIGHT = { code: 'release_in_flight', message: 'Wait for the release in flight to finish first' }
const INSTANCE_NOT_RUNNING = { code: 'instance_not_running', message: 'This instance has expired or been torn down' }
const INSTANCE_HAS_NO_EXPIRY = { code: 'instance_has_no_expiry', message: 'A persistent instance never expires' }

const refusal = (status: number, body: Refusal['body']): Refusal => ({ status, body })

function newRelease(ref: string): Schemas['Release'] {
  return { id: crypto.randomUUID(), commit_sha: PREVIEW_HEAD_SHA, ref, status: ReleaseStatus.Queued, run_number: null, created_at: new Date().toISOString() }
}

function expiryFor(purpose: InstancePurpose, hours: InstanceExpiryHours | null | undefined): string | null {
  if (purpose === InstancePurpose.Persistent) return null
  return new Date(Date.now() + (hours ?? InstanceExpiryHours.ThreeDays) * HOUR_MS).toISOString()
}

function listItemOf(detail: Schemas['InstanceDetail']): Schemas['InstanceListItem'] {
  return {
    id: detail.id,
    application: detail.application,
    purpose: detail.purpose,
    status: detail.status,
    url: detail.url,
    owner: detail.owner,
    task: detail.task,
    latest_release: detail.latest_release,
    expires_at: detail.expires_at,
    created_at: detail.created_at,
  }
}

export const PREVIEW_HEAD_SHA = '9f8e7d6c5b4a39281706f5e4d3c2b1a098765432'

export const PREVIEW_DELAY_MS = 2000

const STACKFILE_NAME = 'stackfile.yaml'

/** Mirrors the api's fake provider: a connection with this login can never re-verify. */
export const NEEDS_REAUTH_LOGIN = 'needs-reauth'

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
  private readonly taskBook: PreviewTaskBook
  private readonly persistKey: string | undefined
  private readonly releaseWalkMs: readonly [number, number]
  private timers: ReturnType<typeof setTimeout>[] = []

  constructor(seed: CatalogSeed, persistKey?: string, taskBook?: PreviewTaskBook, releaseWalkMs: readonly [number, number] = RELEASE_WALK_MS) {
    this.releaseWalkMs = releaseWalkMs
    const seeded = {
      connections: seed.connections,
      repositories: seed.repositories,
      catalogue: seed.catalogue,
      applications: seed.applications,
      instances: seed.instances ?? [],
    }
    // A remembered catalog is a convenience; a blocked or unreadable store must not take the whole preview down with it.
    this.state = persistKey ? readStored(persistKey) ?? seeded : seeded
    this.taskBook = taskBook ?? new PreviewTaskBook(seed.tasks, [])
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
    const target = this.state.connections.find((connection) => connection.id === connectionId)
    if (!target) return null
    const status = target.account_login === NEEDS_REAUTH_LOGIN ? ConnectionStatus.Error : ConnectionStatus.Verified
    this.commit({
      ...this.state,
      connections: this.state.connections.map((connection) => (connection.id === connectionId ? { ...connection, status } : connection)),
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
    const catalogue = this.state.catalogue[input.connection_id]
    if (!connection || !catalogue) return null
    const alreadyAdded = new Set(this.state.repositories.filter((row) => row.connection_id === input.connection_id).map((row) => row.external_id))
    const picked = input.external_ids
      .filter((externalId) => !alreadyAdded.has(externalId))
      .map((externalId) => catalogue.find((entry) => entry.external_id === externalId))
    if (!picked.every((entry): entry is Schemas['AvailableRepository'] => entry !== undefined)) return null
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

  applicationSummary(applicationId: string): Schemas['ApplicationSummary'] | null {
    const detail = this.application(applicationId)
    return detail ? { id: detail.id, name: detail.name } : null
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
    if (input.name !== undefined) this.taskBook.renameApplication(applicationId, input.name)
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
    return this.taskBook.rows().some((row) => row.application.id === applicationId && ACTIVE.includes(row.coarse_status))
  }

  removeApplication(applicationId: string): void {
    this.commit({ ...this.state, applications: this.state.applications.filter((detail) => detail.id !== applicationId) })
    this.taskBook.removeForApplication(applicationId)
  }

  instances(query: { applicationId: string | null; includeTornDown: boolean }): Schemas['InstanceListItem'][] {
    return [...this.state.instances]
      .filter((detail) => query.applicationId === null || detail.application.id === query.applicationId)
      .filter((detail) => query.includeTornDown || detail.status !== InstanceStatus.TornDown)
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .map(listItemOf)
  }

  instance(instanceId: string): Schemas['InstanceDetail'] | null {
    return this.state.instances.find((detail) => detail.id === instanceId) ?? null
  }

  spinUp(input: Schemas['InstanceSpinUp'], owner: Schemas['InstanceOwner']): Schemas['InstanceDetail'] | Refusal {
    if (input.purpose === InstancePurpose.Task) return refusal(400, PURPOSE_RESERVED)
    const application = this.application(input.application_id)
    if (!application) return refusal(404, UNKNOWN_APPLICATION)
    if (NOT_SYNCED.includes(application.sync)) return refusal(409, APPLICATION_NOT_SYNCED)
    const id = crypto.randomUUID()
    const release = newRelease(input.ref ?? application.repository.default_branch)
    const created: Schemas['InstanceDetail'] = {
      id,
      application: { id: application.id, name: application.name },
      repository: application.repository,
      purpose: input.purpose,
      status: InstanceStatus.Provisioning,
      url: `https://${id.slice(0, URL_ID_LENGTH)}.instances.stackbox.test`,
      owner,
      task: null,
      latest_release: release,
      expires_at: expiryFor(input.purpose, input.expires_in_hours),
      created_at: new Date().toISOString(),
      releases: [release],
    }
    this.commit({ ...this.state, instances: [...this.state.instances, created] })
    this.walk(id, release.id)
    return created
  }

  releasesOf(instanceId: string): Schemas['Release'][] | null {
    return this.instance(instanceId)?.releases ?? null
  }

  deploy(instanceId: string, input: Schemas['ReleaseCreate']): Schemas['Release'] | Refusal | null {
    const detail = this.instance(instanceId)
    if (!detail) return null
    if (!RUNNING.includes(detail.status)) return refusal(409, INSTANCE_NOT_RUNNING)
    if (detail.releases.some((release) => IN_FLIGHT.includes(release.status))) return refusal(409, RELEASE_IN_FLIGHT)
    const release = newRelease(input.ref ?? detail.releases[0]?.ref ?? detail.repository.default_branch)
    this.replaceInstance({ ...detail, releases: [release, ...detail.releases], latest_release: release })
    this.walk(instanceId, release.id)
    return release
  }

  teardown(instanceId: string): Schemas['InstanceDetail'] | null {
    const detail = this.instance(instanceId)
    if (!detail) return null
    const next = { ...detail, status: InstanceStatus.TornDown }
    this.replaceInstance(next)
    return next
  }

  extendExpiry(instanceId: string, hours: InstanceExpiryHours): Schemas['InstanceDetail'] | Refusal | null {
    const detail = this.instance(instanceId)
    if (!detail) return null
    if (detail.purpose === InstancePurpose.Persistent) return refusal(409, INSTANCE_HAS_NO_EXPIRY)
    if (!RUNNING.includes(detail.status)) return refusal(409, INSTANCE_NOT_RUNNING)
    const next = { ...detail, expires_at: new Date(Date.now() + hours * HOUR_MS).toISOString() }
    this.replaceInstance(next)
    return next
  }

  dispose(): void {
    for (const timer of this.timers) clearTimeout(timer)
    this.timers = []
  }

  private walk(instanceId: string, releaseId: string): void {
    const [buildingAfterMs, liveAfterMs] = this.releaseWalkMs
    this.timers.push(
      setTimeout(() => this.moveRelease(instanceId, releaseId, ReleaseStatus.Building), buildingAfterMs),
      setTimeout(() => this.moveRelease(instanceId, releaseId, ReleaseStatus.Live), liveAfterMs),
    )
  }

  private moveRelease(instanceId: string, releaseId: string, status: ReleaseStatus): void {
    const detail = this.instance(instanceId)
    if (!detail) return
    const releases = detail.releases.map((release) => (release.id === releaseId ? { ...release, status } : release))
    const landed = status === ReleaseStatus.Live && RUNNING.includes(detail.status)
    this.replaceInstance({ ...detail, releases, latest_release: releases[0] ?? null, status: landed ? InstanceStatus.Ready : detail.status })
  }

  private replaceInstance(next: Schemas['InstanceDetail']): void {
    this.commit({ ...this.state, instances: this.state.instances.map((detail) => (detail.id === next.id ? next : detail)) })
  }

  private replaceApplication(next: Schemas['ApplicationDetail']): void {
    this.commit({ ...this.state, applications: this.state.applications.map((detail) => (detail.id === next.id ? next : detail)) })
  }

  private taskCountOf(applicationId: string): number {
    return this.taskBook.rows().filter((row) => row.application.id === applicationId).length
  }

  private commit(next: CatalogState): void {
    this.state = next
    if (!this.persistKey) return
    try {
      sessionStorage.setItem(this.persistKey, JSON.stringify(next))
    } catch {
      // A remembered catalog is a convenience; losing it is not a failure worth surfacing.
    }
  }
}

function readStored(persistKey: string): CatalogState | null {
  try {
    const stored = sessionStorage.getItem(persistKey)
    return stored ? (JSON.parse(stored) as CatalogState) : null
  } catch {
    return null
  }
}

/** Exposes the `PreviewCatalog` instance too, for a caller that also wires `taskHandlers` onto the same task book. */
export function buildCatalog(seed: CatalogSeed, options: CatalogOptions = {}): { catalog: PreviewCatalog; handlers: HttpHandler[] } {
  const catalog = new PreviewCatalog(seed, options.persistKey, options.taskBook, options.releaseWalkMs)
  return {
    catalog,
    handlers: [...repositoryHandlers(catalog), ...applicationHandlers(catalog, options.delayMs ?? PREVIEW_DELAY_MS), ...instanceHandlers(catalog, PREVIEW_OWNER)],
  }
}

export function catalogHandlers(seed: CatalogSeed, options: CatalogOptions = {}): HttpHandler[] {
  return buildCatalog(seed, options).handlers
}
