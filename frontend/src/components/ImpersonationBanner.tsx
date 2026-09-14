/**
 * Impersonation banner: a persistent indicator shown while a platform admin is
 * viewing as another user.
 *
 * Reads the impersonation marker from the authenticated principal.
 */
import { useAuth } from '../auth/AuthContext';

/**
 * Render the impersonation banner when impersonating.
 *
 * Returns:
 *   The banner element, or null when not impersonating.
 */
export function ImpersonationBanner() {
  const { user } = useAuth();
  if (!user?.impersonatedBy) {
    return null;
  }
  return (
    <div className="impersonation-banner" role="status" aria-live="polite">
      You are viewing as {user.fullName} ({user.email}) — impersonated session.
    </div>
  );
}
