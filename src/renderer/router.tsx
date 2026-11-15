import { createHashRouter, Navigate } from 'react-router';
import { RootLayout } from './layouts/RootLayout';
import { Projects } from './screens/Projects';
import { RouteError } from './screens/RouteError';
import { Splash } from './screens/Splash';

/**
 * Hash routing, not history: the packaged app loads from file://, where the
 * History API has no server to resolve paths.
 *
 * index.html sends returning users straight to /projects before the router
 * mounts; the splash only opens on a first run or via "Back to welcome".
 */
export const router = createHashRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Splash /> },
      { path: 'projects', element: <Projects /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
