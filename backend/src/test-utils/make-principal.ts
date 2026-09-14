/**
 * Shared test helpers for building authenticated principals.
 */
import { AuthPrincipal } from '../modules/auth/auth.service';
import { Role } from '../modules/organizations/membership.entity';

/**
 * Build a test principal with a single membership.
 *
 * Args:
 *   role: The role to grant.
 *   organizationType: The organization category.
 *   organizationId: The organization id.
 *
 * Returns:
 *   An AuthPrincipal for tests.
 */
export function makePrincipal(
  role: Role,
  organizationType = 'property_operator',
  organizationId = 'org-1',
): AuthPrincipal {
  return {
    userId: 'user-1',
    email: 'test@example.com',
    fullName: 'Test User',
    memberships: [
      {
        organizationId,
        organizationName: 'Test Org',
        organizationType,
        role,
      },
    ],
  };
}
