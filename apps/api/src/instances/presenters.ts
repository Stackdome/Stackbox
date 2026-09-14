import type { components } from '@stackbox/contract'
import { presentRelease } from '../releases/presenters'
import { coarseStatusOf } from '../tasks/calc/coarse-status'
import type { InstanceRecord } from './types'

type Schemas = components['schemas']

export function presentListItem(record: InstanceRecord): Schemas['InstanceListItem'] {
  const [latest] = record.releases
  return {
    id: record.id,
    application: record.application,
    purpose: record.purpose,
    status: record.status,
    url: record.url,
    owner: record.owner,
    task: record.task && { id: record.task.id, description: record.task.description, coarse_status: coarseStatusOf(record.task.phase) },
    latest_release: latest ? presentRelease(latest) : null,
    expires_at: record.expiresAt?.toISOString() ?? null,
    created_at: record.createdAt.toISOString(),
  }
}

export function presentDetail(record: InstanceRecord): Schemas['InstanceDetail'] {
  return {
    ...presentListItem(record),
    repository: { id: record.repository.id, full_name: record.repository.fullName, default_branch: record.repository.defaultBranch },
    releases: record.releases.map(presentRelease),
  }
}
