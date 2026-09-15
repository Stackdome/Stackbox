import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, UseGuards } from '@nestjs/common'
import { type components, schemas } from '@stackbox/contract'
import type { AuthUser } from '../access/types'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { ApiTokenService } from './api-token.service'
import { CurrentUser } from './current-user.decorator'
import { JwtCookieGuard } from './jwt-cookie.guard'

type Schemas = components['schemas']

@Controller('api-tokens')
@UseGuards(JwtCookieGuard)
export class ApiTokensController {
  constructor(@Inject(ApiTokenService) private readonly apiTokens: ApiTokenService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<Schemas['ApiTokenList']> {
    return this.apiTokens.list(user)
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(schemas.ApiTokenCreate)) input: Schemas['ApiTokenCreate'],
  ): Promise<Schemas['ApiTokenCreated']> {
    return this.apiTokens.create(user, input)
  }

  @Delete(':token_id')
  @HttpCode(204)
  revoke(@CurrentUser() user: AuthUser, @Param('token_id') tokenId: string): Promise<void> {
    return this.apiTokens.revoke(user, tokenId)
  }
}
