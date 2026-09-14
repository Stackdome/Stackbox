import type { InstanceExpiryHours, components } from '@stackbox/contract'
import api from './client'

type Schemas = components['schemas']

export type InstanceListQuery = { applicationId?: string; includeTornDown?: boolean }

export async function fetchInstances(orgId: string, query: InstanceListQuery = {}): Promise<Schemas['InstanceList']> {
  const { data } = await api.get<Schemas['InstanceList']>(`/organizations/${orgId}/instances`, {
    params: { application_id: query.applicationId, include_torn_down: query.includeTornDown },
  })
  return data
}

export async function fetchInstance(orgId: string, instanceId: string): Promise<Schemas['InstanceDetail']> {
  const { data } = await api.get<Schemas['InstanceDetail']>(`/organizations/${orgId}/instances/${instanceId}`)
  return data
}

export async function spinUpInstance(orgId: string, input: Schemas['InstanceSpinUp']): Promise<Schemas['InstanceDetail']> {
  const { data } = await api.post<Schemas['InstanceDetail']>(`/organizations/${orgId}/instances`, input)
  return data
}

export async function fetchReleases(orgId: string, instanceId: string): Promise<Schemas['ReleaseList']> {
  const { data } = await api.get<Schemas['ReleaseList']>(`/organizations/${orgId}/instances/${instanceId}/releases`)
  return data
}

export async function createRelease(orgId: string, instanceId: string, input: Schemas['ReleaseCreate']): Promise<Schemas['Release']> {
  const { data } = await api.post<Schemas['Release']>(`/organizations/${orgId}/instances/${instanceId}/releases`, input)
  return data
}

export async function teardownInstance(orgId: string, instanceId: string): Promise<Schemas['InstanceDetail']> {
  const { data } = await api.post<Schemas['InstanceDetail']>(`/organizations/${orgId}/instances/${instanceId}/teardown`)
  return data
}

export async function extendInstanceExpiry(orgId: string, instanceId: string, hours: InstanceExpiryHours): Promise<Schemas['InstanceDetail']> {
  const { data } = await api.post<Schemas['InstanceDetail']>(`/organizations/${orgId}/instances/${instanceId}/expiry`, { hours })
  return data
}
