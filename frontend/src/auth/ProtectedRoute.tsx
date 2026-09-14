/**
 * ProtectedRoute: gates a route behind authentication.
 *
 * Redirects unauthenticated visitors to /login and shows a loading state while
 * the session is being restored.
 */
import { Navigate, useLocation } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useAuth } from './AuthContext';

/**
 * Render children only when authenticated.
 *
 * Args:
 *   children: The protected element.
 *
 * Returns:
 *   The element when signed in, a loading indicator while restoring, or a
 *   redirect to /login.
 */
export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="route-loading" role="status" aria-live="polite">
        Loading…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
