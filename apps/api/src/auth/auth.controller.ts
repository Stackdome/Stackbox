import { Body, Controller, HttpCode, Inject, Post, Res } from '@nestjs/common'
import { type components, schemas } from '@stackbox/contract'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { AuthService } from './auth.service'
import { AUTH_COOKIE } from './token-from-headers'
import { ACCESS_TOKEN_SECONDS } from './tokens'

type LoginRequest = components['schemas']['LoginRequest']
type LoginResponse = components['schemas']['LoginResponse']
type RefreshTokenRequest = components['schemas']['RefreshTokenRequest']
type RefreshTokenResponse = components['schemas']['RefreshTokenResponse']

type CookieResponse = {
  cookie(name: string, value: string, options: { httpOnly: boolean; sameSite: 'strict'; path: string; maxAge: number }): void
}

function setAuthCookie(response: CookieResponse, token: string): void {
  response.cookie(AUTH_COOKIE, token, { httpOnly: true, sameSite: 'strict', path: '/', maxAge: ACCESS_TOKEN_SECONDS * 1000 })
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(schemas.LoginRequest)) body: LoginRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<LoginResponse> {
    const session = await this.auth.login(body.email, body.password)
    setAuthCookie(response, session.token)
    return { token: session.token, refresh_token: session.refreshToken, user: session.user, expires_in: ACCESS_TOKEN_SECONDS }
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body(new ZodValidationPipe(schemas.RefreshTokenRequest)) body: RefreshTokenRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<RefreshTokenResponse> {
    const pair = await this.auth.refresh(body.refreshToken)
    setAuthCookie(response, pair.token)
    return pair
  }
}
