import { type CoarseStatus, InstanceExpiryHours, InstancePurpose, InstanceStatus, ReleaseStatus, type components } from '@stackbox/contract'
import { shortSha } from './application'

type Schemas = components['schemas']

export type SpinUpPurpose = Exclude<InstancePurpose, InstancePurpose.Task>

export type ExpiryChoice = InstanceExpiryHours | null

export type ExpiryView = { text: string; tone: 'warning' | 'muted' }

export type ReleaseView = {
  id: string
  shaShort: string
  ref: string | null
  status: ReleaseStatus
  runLabel: string | null
  summary: string
  createdAt: string
}

export type InstanceOwnerView =
  | { kind: 'task'; taskId: string; description: string; coarseStatus: CoarseStatus }
  | { kind: 'user'; name: string }
  | null

export type InstanceView = {
  id: string
  identifier: string
  title: string
  application: { id: string; name: string }
  purpose: InstancePurpose
  purposeLabel: string
  status: InstanceStatus
  url: string | null
  owner: InstanceOwnerView
  latestRelease: ReleaseView | null
  expiresAt: string | null
  createdAt: string
}

export type InstanceDetailView = InstanceView & {
  repository: { id: string; fullName: string; defaultBranch: string }
  releases: ReleaseView[]
}

export type TaskInstanceView = { id: string; identifier: string; status: InstanceStatus }

export type SpinUpDraft = { applicationId: string; purpose: SpinUpPurpose; ref: string; expiry: ExpiryChoice }

export const PURPOSE_LABEL: Record<InstancePurpose, string> = {
  [InstancePurpose.Task]: 'Task',
  [InstancePurpose.Preview]: 'Preview',
  [InstancePurpose.LoadTest]: 'Load test',
  [InstancePurpose.Scratch]: 'Scratch',
  [InstancePurpose.Persistent]: 'Persistent',
}

export const INSTANCE_STATUS_LABEL: Record<InstanceStatus, string> = {
  [InstanceStatus.Provisioning]: 'Provisioning',
  [InstanceStatus.Ready]: 'Ready',
  [InstanceStatus.Degraded]: 'Degraded',
  [InstanceStatus.Expired]: 'Expired',
  [InstanceStatus.TornDown]: 'Torn down',
}

export const RELEASE_STATUS_LABEL: Record<ReleaseStatus, string> = {
  [ReleaseStatus.Queued]: 'Queued',
  [ReleaseStatus.Building]: 'Building',
  [ReleaseStatus.Live]: 'Live',
  [ReleaseStatus.Failed]: 'Failed',
}

export const SPIN_UP_PURPOSES: SpinUpPurpose[] = [InstancePurpose.Scratch, InstancePurpose.Preview, InstancePurpose.LoadTest, InstancePurpose.Persistent]

export const EXPIRY_PRESETS: InstanceExpiryHours[] = [InstanceExpiryHours.Day, InstanceExpiryHours.ThreeDays, InstanceExpiryHours.Week]

export const EXPIRY_PRESET_LABEL: Record<InstanceExpiryHours, string> = {
  [InstanceExpiryHours.Day]: '24h',
  [InstanceExpiryHours.ThreeDays]: '72h',
  [InstanceExpiryHours.Week]: '7d',
}

export const NOT_RUNNING_REASON = 'This instance has expired or been torn down'
export const IN_FLIGHT_REASON = 'Wait for the release in flight to finish'

const IDENTIFIER_LENGTH = 4
const HOUR_MS = 3_600_000
const DAY_HOURS = 24
const WEEK_HOURS = 168
const WARNING_HOURS = 6
const LIVE_INSTANCE_LIMIT = 5
const SETTLED: InstanceStatus[] = [InstanceStatus.Expired, InstanceStatus.TornDown]
const IN_FLIGHT: ReleaseStatus[] = [ReleaseStatus.Queued, ReleaseStatus.Building]

export function instanceIdentifier(purpose: InstancePurpose, id: string): string {
  return `${PURPOSE_LABEL[purpose].toLowerCase()} ${id.slice(0, IDENTIFIER_LENGTH)}`
}

export function expiredAgo(expiresAt: string, now: number): string {
  const hours = Math.floor((now - Date.parse(expiresAt)) / HOUR_MS)
  return hours < 1 ? 'under 1h ago' : `${hours}h ago`
}

export function expiryLabel(expiresAt: string | null, now: number): ExpiryView {
  if (expiresAt === null) return { text: 'No expiry', tone: 'muted' }
  const hoursLeft = (Date.parse(expiresAt) - now) / HOUR_MS
  if (hoursLeft <= 0) return { text: `Expired ${expiredAgo(expiresAt, now)}`, tone: 'muted' }
  const tone = hoursLeft < WARNING_HOURS ? 'warning' : 'muted'
  if (hoursLeft < 1) return { text: 'in under 1h', tone }
  if (hoursLeft < WEEK_HOURS) return { text: `in ${Math.floor(hoursLeft)}h`, tone }
  return { text: `in ${Math.floor(hoursLeft / DAY_HOURS)}d`, tone }
}

export function isRunning(status: InstanceStatus): boolean {
  return !SETTLED.includes(status)
}

export function isReleaseInFlight(status: ReleaseStatus): boolean {
  return IN_FLIGHT.includes(status)
}

export function toRelease(release: Schemas['Release']): ReleaseView {
  const shaShort = shortSha(release.commit_sha)
  return {
    id: release.id,
    shaShort,
    ref: release.ref,
    status: release.status,
    runLabel: release.run_number === null ? null : `Run ${release.run_number}`,
    summary: release.ref === null ? shaShort : `${shaShort} · ${release.ref}`,
    createdAt: release.created_at,
  }
}

function ownerOf(item: Schemas['InstanceListItem']): InstanceOwnerView {
  if (item.task) return { kind: 'task', taskId: item.task.id, description: item.task.description, coarseStatus: item.task.coarse_status }
  if (item.owner) return { kind: 'user', name: item.owner.name }
  return null
}

export function ownerText(owner: InstanceOwnerView): string {
  if (owner === null) return 'No owner'
  return owner.kind === 'task' ? owner.description : owner.name
}

export function toInstance(item: Schemas['InstanceListItem']): InstanceView {
  const identifier = instanceIdentifier(item.purpose, item.id)
  return {
    id: item.id,
    identifier,
    title: `${item.application.name} · ${identifier}`,
    application: item.application,
    purpose: item.purpose,
    purposeLabel: PURPOSE_LABEL[item.purpose],
    status: item.status,
    url: item.url,
    owner: ownerOf(item),
    latestRelease: item.latest_release ? toRelease(item.latest_release) : null,
    expiresAt: item.expires_at,
    createdAt: item.created_at,
  }
}

export function toInstanceDetail(detail: Schemas['InstanceDetail']): InstanceDetailView {
  return {
    ...toInstance(detail),
    repository: { id: detail.repository.id, fullName: detail.repository.full_name, defaultBranch: detail.repository.default_branch },
    releases: detail.releases.map(toRelease),
  }
}

export function toTaskInstance(instance: Schemas['TaskInstance']): TaskInstanceView {
  return { id: instance.id, identifier: instanceIdentifier(InstancePurpose.Task, instance.id), status: instance.status }
}

export function needsPolling(detail: InstanceDetailView): boolean {
  return detail.status === InstanceStatus.Provisioning || detail.releases.some((release) => isReleaseInFlight(release.status))
}

export function deployBlockedReason(detail: InstanceDetailView): string | null {
  if (!isRunning(detail.status)) return NOT_RUNNING_REASON
  if (detail.releases.some((release) => isReleaseInFlight(release.status))) return IN_FLIGHT_REASON
  return null
}

export function liveInstances(instances: InstanceView[]): InstanceView[] {
  return instances.filter((instance) => isRunning(instance.status)).slice(0, LIVE_INSTANCE_LIMIT)
}

export function toSpinUpInput(draft: SpinUpDraft): Schemas['InstanceSpinUp'] {
  const ref = draft.ref.trim()
  return {
    application_id: draft.applicationId,
    purpose: draft.purpose,
    expires_in_hours: draft.expiry,
    ...(ref !== '' && { ref }),
  }
}
