import type { IncomingHttpHeaders } from 'node:http'
import { Body, Controller, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common'
import { type components, schemas } from '@stackbox/contract'
import type { AuthUser } from '../access/types'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { AuthService } from './auth.service'
import { type CookieResponse, REFRESH_COOKIE, SessionCookies, cookieFrom } from './cookies'
import { CurrentUser } from './current-user.decorator'
import { JwtCookieGuard } from './jwt-cookie.guard'
import { SessionOnlyGuard } from './session-only.guard'

type Schemas = components['schemas']

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(SessionCookies) private readonly cookies: SessionCookies,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(schemas.LoginRequest)) body: Schemas['LoginRequest'],
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<Schemas['Session']> {
    const session = await this.auth.login(body)
    this.cookies.set(response, session.tokens)
    return { user: session.user }
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() request: { headers: IncomingHttpHeaders }, @Res({ passthrough: true }) response: CookieResponse): Promise<Schemas['Session']> {
    const session = await this.auth.refresh(cookieFrom(request.headers, REFRESH_COOKIE))
    this.cookies.set(response, session.tokens)
    return { user: session.user }
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtCookieGuard, SessionOnlyGuard)
  async logout(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) response: CookieResponse): Promise<void> {
    await this.auth.logout(user)
    this.cookies.clear(response)
  }
}
