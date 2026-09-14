/**
 * CurrentUser decorator: injects the authenticated principal into a handler.
 *
 * The principal is attached to the request by the JWT auth guard after token
 * validation.
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthPrincipal } from '../../modules/auth/auth.service';

/**
 * Resolve the authenticated principal from the request.
 *
 * Returns:
 *   The AuthPrincipal attached by the auth guard, or undefined when absent.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthPrincipal | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
