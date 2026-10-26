import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useNavigate,
  useParams,
  useLocation,
} from 'react-router';
import { useEffect } from 'react';
import { SessionProvider, useSession } from './data/SessionContext';
import { SiteShell } from './shells/SiteShell';
import { SchoolShell } from './shells/SchoolShell';
import { LauncherChrome } from './shells/LauncherChrome';
import { LoginPage } from './screens/auth/LoginPage';
import { ChooseProductsPage } from './screens/launcher/ChooseProductsPage';
import { AllSitesLaunchPage } from './screens/sites/AllSitesLaunchPage';
import { AllSchoolsLaunchPage } from './screens/schools/AllSchoolsLaunchPage';
import { SiteDashboard } from './screens/site/SiteDashboard';
import { SchoolDashboard } from './screens/school/SchoolDashboard';
import { PlaceholderPage } from './screens/PlaceholderPage';
import { JobsPage } from './components/JobsPage';
import { AvailabilityListPage } from './components/availability/AvailabilityListPage';
import type { ProductKind } from './data/session';

// NOTE: The "Network Layer" (consortium) surfaces were a parallel project and are
// intentionally not routed in this shell. NetworkShell / NetworkDashboard / MembersPage
// and LaunchSelectPage remain in the codebase for future iterations.

/** Redirect unauthenticated users to /login */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session.isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [session.isAuthenticated, navigate]);

  if (!session.isAuthenticated) return null;
  return <>{children}</>;
}

function RootLayout() {
  return (
    <SessionProvider>
      <Outlet />
    </SessionProvider>
  );
}

function LauncherLayout({ product }: { product: ProductKind }) {
  return (
    <RequireAuth>
      <LauncherChrome product={product}>
        <Outlet />
      </LauncherChrome>
    </RequireAuth>
  );
}

function SiteLayout() {
  return (
    <RequireAuth>
      <SiteShell />
    </RequireAuth>
  );
}

function SchoolLayout() {
  return (
    <RequireAuth>
      <SchoolShell />
    </RequireAuth>
  );
}

/**
 * React Router v7 route tree — one line per screen under shell layouts.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      { path: 'login', element: <LoginPage /> },

      {
        path: 'choose-products',
        element: (
          <RequireAuth>
            <ChooseProductsPage />
          </RequireAuth>
        ),
      },

      {
        path: 'sites',
        element: <LauncherLayout product="site" />,
        children: [{ index: true, element: <AllSitesLaunchPage /> }],
      },

      {
        path: 'schools',
        element: <LauncherLayout product="school" />,
        children: [{ index: true, element: <AllSchoolsLaunchPage /> }],
      },

      {
        path: 'site/:siteId',
        element: <SiteLayout />,
        children: [
          { index: true, element: <SiteDashboard /> },
          { path: 'jobs/*', element: <JobsPageAdapter /> },
          { path: 'locations', element: <PlaceholderPage title="Locations" /> },
          { path: 'personnel', element: <PlaceholderPage title="Personnel" /> },
          { path: 'partners', element: <PlaceholderPage title="School Partners" /> },
          { path: 'availability/*', element: <AvailabilityPageAdapter /> },
          { path: 'slot-requests', element: <PlaceholderPage title="Slot Requests" /> },
          { path: 'schedules', element: <PlaceholderPage title="Schedules" /> },
          { path: 'reports', element: <PlaceholderPage title="Reports" /> },
          { path: 'site-configuration', element: <PlaceholderPage title="Site Configuration" /> },
        ],
      },

      {
        path: 'school/:schoolId',
        element: <SchoolLayout />,
        children: [
          { index: true, element: <SchoolDashboard /> },
          { path: 'explore', element: <PlaceholderPage title="Explore & apply for Availability" /> },
          { path: 'dashboard', element: <PlaceholderPage title="Dashboard" /> },
          { path: 'requests', element: <PlaceholderPage title="Requests" /> },
          { path: 'schedules', element: <PlaceholderPage title="Schedules" /> },
          { path: 'reports', element: <PlaceholderPage title="Reports" /> },
        ],
      },

      { path: '*', element: <Navigate to="/login" replace /> },
    ],
  },
]);

/** Adapt the Availability list (path/nav props) into the site shell outlet */
function AvailabilityPageAdapter() {
  const navigate = useNavigate();
  const { siteId } = useParams<{ siteId: string }>();
  const location = useLocation();
  const currentPath = location.pathname.replace(`/site/${siteId}`, '') || '/availability';
  return (
    <AvailabilityListPage
      currentPath={currentPath}
      onNavigate={(href) => navigate(`/site/${siteId}${href}`)}
    />
  );
}

/** Adapt existing JobsPage (path/nav props) into the site shell outlet */
function JobsPageAdapter() {
  const navigate = useNavigate();
  return (
    <JobsPage
      currentPath="/jobs"
      onNavigate={(href) => {
        navigate(href.startsWith('/jobs') ? '.' : href);
      }}
    />
  );
}
