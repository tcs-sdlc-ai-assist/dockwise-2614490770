/**
 * Roles guard: enforces role-based authorization on protected routes.
 *
 * Reads the roles declared by the @Roles decorator and verifies the
 * authenticated principal holds at least one of them. Returns 403 (not an
 * empty 200) when the caller lacks any permitted role.
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../../modules/organizations/membership.entity';
import { AuthPrincipal } from '../../modules/auth/auth.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Permit the request when the principal holds an allowed role.
   *
   * Args:
   *   context: The current execution context.
   *
   * Returns:
   *   True when no roles are declared or the principal matches one.
   *
   * Raises:
   *   ForbiddenException: When the principal lacks every permitted role.
   */
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const principal = request.user as AuthPrincipal | undefined;
    if (!principal) {
      throw new ForbiddenException('Access denied');
    }
    const held = principal.memberships.map((m) => m.role);
    const ok = required.some((r) => held.includes(r));
    if (!ok) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
