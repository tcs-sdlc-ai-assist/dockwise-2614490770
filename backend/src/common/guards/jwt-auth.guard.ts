/**
 * JWT auth guard: requires a valid Bearer access token on protected routes.
 *
 * Routes marked public (the auth endpoints) are exempt via the IS_PUBLIC
 * metadata key so the global 401 handler excludes them.
 */
import {
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AuthPrincipal } from '../../modules/auth/auth.service';

/** Metadata key marking a route as public (no token required). */
export const IS_PUBLIC_KEY = 'isPublic';

/** Mark a route handler as public, bypassing JWT authentication. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * Allow public routes through; otherwise enforce JWT authentication.
   *
   * Args:
   *   context: The current execution context.
   *
   * Returns:
   *   True when the request may proceed.
   */
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  /**
   * Normalize authentication failures to a 401 response.
   *
   * Raises:
   *   UnauthorizedException: When the token is missing or invalid.
   */
  handleRequest<TUser = AuthPrincipal>(
    err: unknown,
    user: TUser | false,
  ): TUser {
    if (err || !user) {
      throw new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
