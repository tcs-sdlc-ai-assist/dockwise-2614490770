/**
 * Authenticated home page for Dockwise.
 *
 * A simple operational landing for signed-in users, showing the current
 * principal and the organizations they belong to. Feature navigation is added
 * by later slices.
 */
import { useAuth } from '../../auth/AuthContext';

/**
 * Render the authenticated home page.
 *
 * Returns:
 *   The home page element.
 */
export function HomePage() {
  const { user, logout } = useAuth();

  return (
    <main className="app-page">
      <header className="app-header">
        <h1>Dockwise</h1>
        <button type="button" className="btn btn-secondary" onClick={logout}>
          Sign out
        </button>
      </header>
      <section className="card">
        <h2>Welcome, {user?.fullName}</h2>
        <p className="muted">{user?.email}</p>
        <h3>Your organizations</h3>
        <ul>
          {user?.memberships.map((m) => (
            <li key={`${m.organizationId}-${m.role}`}>
              {m.organizationName} — <span className="muted">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
