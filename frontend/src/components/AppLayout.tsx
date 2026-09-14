/**
 * App layout: the authenticated shell with feature navigation.
 *
 * Provides a header with the product name, role-aware feature navigation, the
 * notification bell, and sign-out, plus the impersonation banner. Feature
 * links let users (and E2E specs) navigate by clicking rather than teleporting.
 */
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { NotificationBell } from './NotificationBell';
import { ImpersonationBanner } from './ImpersonationBanner';
import type { Role } from '../types';

/** A navigation link visible to a set of roles. */
interface NavItem {
  to: string;
  label: string;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/book', label: 'Book', roles: ['tenant_booker', 'tenant_admin'] },
  { to: '/appointments', label: 'My appointments', roles: ['tenant_booker', 'tenant_admin', 'carrier_dispatcher'] },
  { to: '/queue', label: 'Queue', roles: ['site_coordinator', 'site_admin', 'platform_admin'] },
  { to: '/board', label: 'Live board', roles: ['site_coordinator', 'site_admin', 'platform_admin', 'gate_officer', 'dock_lead'] },
  { to: '/gate', label: 'Gate', roles: ['gate_officer', 'site_coordinator', 'site_admin'] },
  { to: '/dock', label: 'Dock', roles: ['dock_lead', 'site_coordinator', 'site_admin'] },
  { to: '/search', label: 'Search', roles: ['site_admin', 'site_coordinator', 'tenant_admin', 'auditor', 'platform_admin'] },
  { to: '/dashboard', label: 'Dashboard', roles: ['site_admin', 'tenant_admin', 'platform_admin'] },
  { to: '/admin/sites', label: 'Sites', roles: ['site_admin', 'platform_admin'] },
];

/**
 * Render the authenticated app shell.
 *
 * Returns:
 *   The app layout element with navigation and an outlet for the page.
 */
export function AppLayout() {
  const { user, logout } = useAuth();
  const heldRoles = new Set(user?.memberships.map((m) => m.role) ?? []);
  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.some((r) => heldRoles.has(r)),
  );

  return (
    <div className="app-shell">
      <ImpersonationBanner />
      <header className="app-shell-header">
        <Link to="/app" className="app-shell-brand">
          Dockwise
        </Link>
        <nav className="app-shell-nav" aria-label="Features">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="app-header-actions">
          <NotificationBell />
          <button type="button" className="btn btn-secondary" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <div className="app-shell-content">
        <Outlet />
      </div>
    </div>
  );
}
