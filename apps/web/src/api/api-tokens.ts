import type { components } from '@stackbox/contract'
import api from './client'

type Schemas = components['schemas']

export async function fetchApiTokens(): Promise<Schemas['ApiTokenList']> {
  const { data } = await api.get<Schemas['ApiTokenList']>('/api-tokens')
  return data
}

export async function createApiToken(input: Schemas['ApiTokenCreate']): Promise<Schemas['ApiTokenCreated']> {
  const { data } = await api.post<Schemas['ApiTokenCreated']>('/api-tokens', input)
  return data
}

export async function revokeApiToken(tokenId: string): Promise<void> {
  await api.delete(`/api-tokens/${tokenId}`)
}
