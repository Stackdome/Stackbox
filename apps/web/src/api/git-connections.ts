import type { components } from '@stackbox/contract'
import api from './client'

type Schemas = components['schemas']

export async function fetchGitConnections(orgId: string): Promise<Schemas['GitConnectionList']> {
  const { data } = await api.get<Schemas['GitConnectionList']>(`/organizations/${orgId}/git-connections`)
  return data
}

export async function createGitConnection(orgId: string, input: Schemas['GitConnectionCreate']): Promise<Schemas['GitConnection']> {
  const { data } = await api.post<Schemas['GitConnection']>(`/organizations/${orgId}/git-connections`, input)
  return data
}

export async function verifyGitConnection(orgId: string, connectionId: string): Promise<Schemas['GitConnection']> {
  const { data } = await api.post<Schemas['GitConnection']>(`/organizations/${orgId}/git-connections/${connectionId}/verify`)
  return data
}

export async function fetchAvailableRepositories(orgId: string, connectionId: string): Promise<Schemas['AvailableRepositoryList']> {
  const { data } = await api.get<Schemas['AvailableRepositoryList']>(`/organizations/${orgId}/git-connections/${connectionId}/available-repositories`)
  return data
}
