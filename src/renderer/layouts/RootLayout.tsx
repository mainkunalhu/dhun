import { Outlet } from 'react-router';

/**
 * The window frame. Screen chrome (project rail, title bar) will live here
 * once the studio exists; for now it is a passthrough so each screen owns its
 * own layout.
 */
export function RootLayout() {
  return <Outlet />;
}
