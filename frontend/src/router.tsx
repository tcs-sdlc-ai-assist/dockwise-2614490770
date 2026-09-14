/**
 * Application router for the Dockwise frontend.
 *
 * The single source of routing. The root route renders a public landing page;
 * protected routes are gated behind authentication and wrapped in the shared
 * app layout (feature navigation, notification bell, impersonation banner).
 */
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LandingPage } from './features/landing/LandingPage';
import { LoginPage } from './features/auth/LoginPage';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { HomePage } from './features/home/HomePage';
import { SitesPage } from './features/admin/SitesPage';
import { SiteDetailPage } from './features/admin/SiteDetailPage';
import { BookingPage } from './features/booking/BookingPage';
import { MyAppointmentsPage } from './features/booking/MyAppointmentsPage';
import { QueuePage } from './features/coordinator/QueuePage';
import { LiveBoardPage } from './features/board/LiveBoardPage';
import { GatePage } from './features/gate/GatePage';
import { DockPage } from './features/dock/DockPage';
import { VisitDetailPage } from './features/visits/VisitDetailPage';
import { SearchPage } from './features/reports/SearchPage';
import { DashboardPage } from './features/reports/DashboardPage';

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
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/app', element: <HomePage /> },
      { path: '/admin/sites', element: <SitesPage /> },
      { path: '/admin/sites/:siteId', element: <SiteDetailPage /> },
      { path: '/book', element: <BookingPage /> },
      { path: '/appointments', element: <MyAppointmentsPage /> },
      { path: '/queue', element: <QueuePage /> },
      { path: '/board', element: <LiveBoardPage /> },
      { path: '/gate', element: <GatePage /> },
      { path: '/dock', element: <DockPage /> },
      { path: '/visits/:visitId', element: <VisitDetailPage /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/dashboard', element: <DashboardPage /> },
    ],
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
