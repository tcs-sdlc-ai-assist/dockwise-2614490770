/**
 * Roles decorator: marks a route handler with the roles allowed to invoke it.
 *
 * Read by RolesGuard to enforce organization-and-role authorization on every
 * protected list/detail API.
 */
import { SetMetadata } from '@nestjs/common';
import { Role } from '../../modules/organizations/membership.entity';

/** Metadata key under which allowed roles are stored. */
export const ROLES_KEY = 'roles';

/**
 * Declare the roles permitted to access a route.
 *
 * Args:
 *   roles: One or more roles allowed to invoke the handler.
 *
 * Returns:
 *   A decorator attaching the role set to the handler metadata.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
