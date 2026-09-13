import type { components } from '@stackbox/contract'
import api from './client'

type User = components['schemas']['User']

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await api.get<User>('/users/current')
  return data
}
