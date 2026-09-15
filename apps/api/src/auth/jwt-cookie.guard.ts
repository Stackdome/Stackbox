import type { IncomingHttpHeaders } from 'node:http'
import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common'
import type { AuthUser } from '../access/types'
import { AuthService } from './auth.service'
import { type Credential, credentialFromHeaders } from './token-from-headers'

export type RequestWithCredential = { headers: IncomingHttpHeaders; user?: AuthUser; credentialKind?: Credential['kind'] }

@Injectable()
export class JwtCookieGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithCredential>()
    const credential = credentialFromHeaders(request.headers)
    request.credentialKind = credential?.kind
    request.user = await this.auth.authenticate(credential)
    return true
  }
}
