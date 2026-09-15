import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { INVALID_SESSION } from './errors'
import type { RequestWithCredential } from './jwt-cookie.guard'
import { CredentialKind } from './token-from-headers'

// Runs after JwtCookieGuard, which stamps the credential kind on the request.
@Injectable()
export class SessionOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithCredential>()
    if (request.credentialKind === CredentialKind.ApiToken) throw new UnauthorizedException(INVALID_SESSION)
    return true
  }
}
