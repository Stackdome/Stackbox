import type { IncomingHttpHeaders } from 'node:http'
import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common'
import type { AuthUser } from '../access/types'
import { AuthService } from './auth.service'
import { credentialFromHeaders } from './token-from-headers'

@Injectable()
export class JwtCookieGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: IncomingHttpHeaders; user?: AuthUser }>()
    request.user = await this.auth.authenticate(credentialFromHeaders(request.headers))
    return true
  }
}
