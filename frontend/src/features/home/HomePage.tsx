/**
 * Authenticated home page for Dockwise.
 *
 * A simple operational landing for signed-in users, showing the current
 * principal and the organizations they belong to. Feature navigation lives in
 * the shared app layout.
 */
import { useAuth } from '../../auth/AuthContext';

/**
 * Render the authenticated home page.
 *
 * Returns:
 *   The home page element.
 */
export function HomePage() {
  const { user } = useAuth();

  return (
    <main className="app-page">
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
