import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtCookieGuard } from './jwt-cookie.guard'
import { Tokens, requireJwtSecret } from './tokens'
import { UsersController } from './users.controller'

@Module({
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    JwtCookieGuard,
    { provide: Tokens, useFactory: () => new Tokens(requireJwtSecret(process.env.JWT_SECRET)) },
  ],
  exports: [Tokens, JwtCookieGuard],
})
export class AuthModule {}
