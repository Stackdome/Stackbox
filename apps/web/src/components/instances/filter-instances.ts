import { type InstancePurpose, InstanceStatus } from '@stackbox/contract'
import { type InstanceView, ownerText } from '@/api/mappers/instance'

export const ALL = 'all'

export type InstanceFilter = {
  q: string
  applicationId: string
  purpose: InstancePurpose | typeof ALL
  status: InstanceStatus | typeof ALL
  showTornDown: boolean
}

export const DEFAULT_INSTANCE_FILTER: InstanceFilter = { q: '', applicationId: ALL, purpose: ALL, status: ALL, showTornDown: false }

export function filterInstances(instances: InstanceView[], filter: InstanceFilter): InstanceView[] {
  const q = filter.q.trim().toLowerCase()
  return instances.filter(
    (instance) =>
      (filter.showTornDown || instance.status !== InstanceStatus.TornDown) &&
      (filter.applicationId === ALL || instance.application.id === filter.applicationId) &&
      (filter.purpose === ALL || instance.purpose === filter.purpose) &&
      (filter.status === ALL || instance.status === filter.status) &&
      (q === '' || [instance.title, instance.url ?? '', ownerText(instance.owner)].some((text) => text.toLowerCase().includes(q))),
  )
}

export function isFiltered(filter: InstanceFilter): boolean {
  return filter.q.trim() !== '' || filter.applicationId !== ALL || filter.purpose !== ALL || filter.status !== ALL
}

/** Picking the Torn down status turns Show torn down on too, so the fetch and the filter agree on which rows exist. */
export function statusPicked(filter: InstanceFilter, status: InstanceFilter['status']): InstanceFilter {
  return status === InstanceStatus.TornDown ? { ...filter, status, showTornDown: true } : { ...filter, status }
}
