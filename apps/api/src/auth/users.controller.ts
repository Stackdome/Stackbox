import { Controller, Get, UseGuards } from '@nestjs/common'
import type { components } from '@stackbox/contract'
import type { AuthUser } from '../access/types'
import { AuthService } from './auth.service'
import { CurrentUser } from './current-user.decorator'
import { JwtCookieGuard } from './jwt-cookie.guard'

@Controller('users')
@UseGuards(JwtCookieGuard)
export class UsersController {
  constructor(private readonly auth: AuthService) {}

  @Get('current')
  current(@CurrentUser() user: AuthUser): Promise<components['schemas']['User']> {
    return this.auth.currentUser(user.id)
  }
}
