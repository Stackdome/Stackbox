import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Res, UseGuards } from '@nestjs/common'
import { type components, schemas } from '@stackbox/contract'
import { AccessGuard, Action, type AuthUser, RequirePermission } from '../access'
import { AuthService, type CookieResponse, CurrentUser, JwtCookieGuard, SessionCookies } from '../auth'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { InviteService } from './invite.service'

type Schemas = components['schemas']

const INVITES_RESOURCE = '/organizations/:org_id/invites'
const INVITE_RESOURCE = '/organizations/:org_id/invites/:invite_id'

@Controller('organizations/:org_id/invites')
@UseGuards(JwtCookieGuard, AccessGuard)
export class InvitesController {
  constructor(@Inject(InviteService) private readonly invites: InviteService) {}

  @Get()
  @RequirePermission(INVITES_RESOURCE, Action.List)
  list(@Param('org_id') orgId: string): Promise<Schemas['InviteList']> {
    return this.invites.list(orgId)
  }

  @Post()
  @RequirePermission(INVITES_RESOURCE, Action.Create)
  create(
    @Param('org_id') orgId: string,
    @CurrentUser() caller: AuthUser,
    @Body(new ZodValidationPipe(schemas.InviteCreate)) input: Schemas['InviteCreate'],
  ): Promise<Schemas['InviteCreated']> {
    return this.invites.create(orgId, caller, input)
  }

  @Delete(':invite_id')
  @HttpCode(204)
  @RequirePermission(INVITE_RESOURCE, Action.Delete)
  revoke(@Param('org_id') orgId: string, @Param('invite_id') inviteId: string): Promise<void> {
    return this.invites.revoke(orgId, inviteId)
  }
}

// The two routes a person reaches from an invite link before they have an account; no guard by design (R7).
@Controller('invites')
export class InviteAcceptController {
  constructor(
    @Inject(InviteService) private readonly invites: InviteService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(SessionCookies) private readonly cookies: SessionCookies,
  ) {}

  @Get(':token')
  preview(@Param('token') token: string): Promise<Schemas['InvitePreview']> {
    return this.invites.preview(token)
  }

  @Post(':token/accept')
  @HttpCode(200)
  async accept(
    @Param('token') token: string,
    @Body(new ZodValidationPipe(schemas.InviteAccept)) input: Schemas['InviteAccept'],
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<Schemas['Session']> {
    const session = await this.auth.sessionFor(await this.invites.accept(token, input))
    this.cookies.set(response, session.tokens)
    return { user: session.user }
  }
}
