import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { components } from '@stackbox/contract'
import { z } from 'zod'
import type { AuthUser } from '../access/types'
import { hashSecret, newSecret, prefixOf } from '../common/secret'
import { ApiTokenStore } from '../db/api-token-store'
import { CLOCK, type Clock } from '../ports'
import { apiTokenExpiresAt } from './calc/api-token'
import { API_TOKEN_NOT_FOUND } from './errors'
import { presentApiToken } from './presenters'

type Schemas = components['schemas']

const uuid = z.string().uuid()

@Injectable()
export class ApiTokenService {
  constructor(
    @Inject(ApiTokenStore) private readonly apiTokens: ApiTokenStore,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async list(user: AuthUser): Promise<Schemas['ApiTokenList']> {
    return { items: (await this.apiTokens.listFor(user.id)).map(presentApiToken) }
  }

  // The secret leaves the api once, in this answer; only its hash is kept.
  async create(user: AuthUser, input: Schemas['ApiTokenCreate']): Promise<Schemas['ApiTokenCreated']> {
    const secret = newSecret()
    const stored = await this.apiTokens.insert({
      userId: user.id,
      orgId: user.orgId,
      name: input.name.trim(),
      tokenHash: hashSecret(secret),
      prefix: prefixOf(secret),
      expiresAt: apiTokenExpiresAt(input.expires_in_days, this.clock.now()),
    })
    return { ...presentApiToken(stored), secret }
  }

  async revoke(user: AuthUser, tokenId: string): Promise<void> {
    const revoked = uuid.safeParse(tokenId).success && (await this.apiTokens.revoke(user.id, tokenId, this.clock.now()))
    if (!revoked) throw new NotFoundException(API_TOKEN_NOT_FOUND)
  }
}
