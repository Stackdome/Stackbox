import type { components } from '@stackbox/contract'
import api from './client'

type ApplicationList = components['schemas']['ApplicationList']

export async function fetchApplications(orgId: string): Promise<ApplicationList> {
  const { data } = await api.get<ApplicationList>(`/organizations/${orgId}/applications`)
  return data
}
