import type { IncomingHttpHeaders } from 'node:http'
import { type CanActivate, type ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import type { AuthUser } from '../access/types'
import { tokenFromHeaders } from './token-from-headers'
import { Tokens } from './tokens'

@Injectable()
export class JwtCookieGuard implements CanActivate {
  constructor(@Inject(Tokens) private readonly tokens: Tokens) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: IncomingHttpHeaders; user?: AuthUser }>()
    const token = tokenFromHeaders(request.headers)
    if (!token) {
      throw new UnauthorizedException({ message: 'auth token is missing' })
    }
    request.user = await this.tokens.verifyAccess(token).catch(() => {
      throw new UnauthorizedException({ message: 'token expired or invalid' })
    })
    return true
  }
}
