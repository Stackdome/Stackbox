import type { components } from '@stackbox/contract'
import api from './client'

type Artifact = components['schemas']['Artifact']

export async function uploadScreenshot(orgId: string, file: File): Promise<Artifact> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<Artifact>(`/organizations/${orgId}/artifacts`, form)
  return data
}
