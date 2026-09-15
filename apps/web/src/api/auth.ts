import type { components } from '@stackbox/contract'
import api from './client'

type Schemas = components['schemas']

export async function signIn(input: Schemas['LoginRequest']): Promise<Schemas['Session']> {
  const { data } = await api.post<Schemas['Session']>('/auth/login', input)
  return data
}

export async function signOut(): Promise<void> {
  await api.post('/auth/logout')
}
