/**
 * Public landing page for Dockwise.
 *
 * Type-led and restrained per the minimalist house style: a large heading, one
 * short subheading, and a single accent call to action. Unauthenticated
 * visitors land here; signed-in users are routed onward to the app.
 */
import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';

/**
 * Render the public landing page.
 *
 * Returns:
 *   The landing page element.
 */
export function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/app', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <main className="landing">
      <div className="landing-inner">
        <p className="eyebrow muted">Meridian Logistics Properties</p>
        <h1>One calendar for every dock.</h1>
        <p className="lede muted">
          Dockwise is the shared loading-dock appointment, courtyard queue, and
          visit-audit record for multi-tenant warehouses. Book a door, run the
          gate, and keep a timestamped trail — in one place.
        </p>
        <div className="landing-actions">
          <Link to="/login" className="btn btn-primary">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
