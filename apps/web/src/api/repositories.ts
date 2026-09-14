import type { components } from '@stackbox/contract'
import api, { isAxiosError } from './client'

type Schemas = components['schemas']

export const REPOSITORY_IN_USE = 'repository_in_use'

export async function fetchRepositories(orgId: string): Promise<Schemas['RepositoryList']> {
  const { data } = await api.get<Schemas['RepositoryList']>(`/organizations/${orgId}/repositories`)
  return data
}

export async function addRepositories(orgId: string, input: Schemas['RepositoryAdd']): Promise<Schemas['RepositoryList']> {
  const { data } = await api.post<Schemas['RepositoryList']>(`/organizations/${orgId}/repositories`, input)
  return data
}

export async function removeRepository(orgId: string, repositoryId: string): Promise<void> {
  await api.delete(`/organizations/${orgId}/repositories/${repositoryId}`)
}

export function blockingApplicationsOf(error: unknown): Schemas['ApplicationSummary'][] | null {
  const body = isAxiosError(error) ? (error.response?.data as Partial<Schemas['RepositoryInUse']> | undefined) : undefined
  return body?.code === REPOSITORY_IN_USE && body.applications ? body.applications : null
}
