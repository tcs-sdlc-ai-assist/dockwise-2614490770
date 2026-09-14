/**
 * JWT strategy: validates Bearer access tokens and resolves the principal.
 *
 * Extracts the token from the Authorization header, verifies the signature and
 * expiry, and loads the current principal so disabled accounts are rejected
 * even when holding an unexpired token.
 */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService, AuthPrincipal } from './auth.service';
import { config } from '../../config/configuration';

interface JwtPayload {
  sub: string;
  email: string;
  impersonatedBy?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly auth: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  /**
   * Resolve the authenticated principal from a verified token payload.
   *
   * Args:
   *   payload: The decoded JWT payload.
   *
   * Returns:
   *   The current AuthPrincipal, carrying any impersonation marker.
   */
  async validate(payload: JwtPayload): Promise<AuthPrincipal> {
    const principal = await this.auth.principalForUserId(payload.sub);
    if (payload.impersonatedBy) {
      principal.impersonatedBy = payload.impersonatedBy;
    }
    return principal;
  }
}
