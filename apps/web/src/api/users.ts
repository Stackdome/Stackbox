import type { components } from '@stackbox/contract'
import api from './client'

type CurrentUser = components['schemas']['CurrentUser']

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const { data } = await api.get<CurrentUser>('/users/current')
  return data
}
