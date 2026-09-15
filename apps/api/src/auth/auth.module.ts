import { Module } from '@nestjs/common'
import { PortsModule } from '../ports/ports.module'
import { ApiTokenService } from './api-token.service'
import { ApiTokensController } from './api-tokens.controller'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { SessionCookies } from './cookies'
import { JwtCookieGuard } from './jwt-cookie.guard'
import { AUTH_SETTINGS, authSettingsFrom } from './settings'
import { Tokens, requireJwtSecret } from './tokens'
import { UsersController } from './users.controller'

@Module({
  imports: [PortsModule],
  controllers: [AuthController, UsersController, ApiTokensController],
  providers: [
    AuthService,
    ApiTokenService,
    JwtCookieGuard,
    SessionCookies,
    { provide: AUTH_SETTINGS, useFactory: () => authSettingsFrom(process.env) },
    { provide: Tokens, useFactory: () => new Tokens(requireJwtSecret(process.env.JWT_SECRET)) },
  ],
  exports: [Tokens, JwtCookieGuard, AuthService, SessionCookies],
})
export class AuthModule {}
