import type { components } from '@stackbox/contract'
import api from './client'

type Schemas = components['schemas']

export async function fetchApplications(orgId: string): Promise<Schemas['ApplicationList']> {
  const { data } = await api.get<Schemas['ApplicationList']>(`/organizations/${orgId}/applications`)
  return data
}

export async function fetchApplication(orgId: string, applicationId: string): Promise<Schemas['ApplicationDetail']> {
  const { data } = await api.get<Schemas['ApplicationDetail']>(`/organizations/${orgId}/applications/${applicationId}`)
  return data
}

export async function detectStackfile(orgId: string, input: Schemas['StackfileDetect']): Promise<Schemas['StackfileDetection']> {
  const { data } = await api.post<Schemas['StackfileDetection']>(`/organizations/${orgId}/applications/detect`, input)
  return data
}

export async function createApplication(orgId: string, input: Schemas['ApplicationCreate']): Promise<Schemas['ApplicationDetail']> {
  const { data } = await api.post<Schemas['ApplicationDetail']>(`/organizations/${orgId}/applications`, input)
  return data
}

export async function updateApplication(orgId: string, applicationId: string, input: Schemas['ApplicationUpdate']): Promise<Schemas['ApplicationDetail']> {
  const { data } = await api.patch<Schemas['ApplicationDetail']>(`/organizations/${orgId}/applications/${applicationId}`, input)
  return data
}

export async function syncApplication(orgId: string, applicationId: string): Promise<Schemas['ApplicationDetail']> {
  const { data } = await api.post<Schemas['ApplicationDetail']>(`/organizations/${orgId}/applications/${applicationId}/sync`)
  return data
}

export async function deleteApplication(orgId: string, applicationId: string): Promise<void> {
  await api.delete(`/organizations/${orgId}/applications/${applicationId}`)
}
