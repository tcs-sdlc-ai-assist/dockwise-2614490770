/**
 * Application router for the Dockwise frontend.
 *
 * The single source of routing. The root route renders a public landing page;
 * protected routes are gated behind authentication. One route per page.
 */
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LandingPage } from './features/landing/LandingPage';
import { LoginPage } from './features/auth/LoginPage';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { HomePage } from './features/home/HomePage';
import { SitesPage } from './features/admin/SitesPage';
import { SiteDetailPage } from './features/admin/SiteDetailPage';
import { BookingPage } from './features/booking/BookingPage';
import { MyAppointmentsPage } from './features/booking/MyAppointmentsPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <HomePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/sites',
    element: (
      <ProtectedRoute>
        <SitesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/sites/:siteId',
    element: (
      <ProtectedRoute>
        <SiteDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/book',
    element: (
      <ProtectedRoute>
        <BookingPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/appointments',
    element: (
      <ProtectedRoute>
        <MyAppointmentsPage />
      </ProtectedRoute>
    ),
  },
]);

/**
 * Provide the application router.
 *
 * Returns:
 *   The RouterProvider element.
 */
export function AppRouter() {
  return <RouterProvider router={router} />;
}
