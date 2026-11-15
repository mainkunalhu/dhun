import { Outlet, useLocation } from 'react-router';
import { Sidebar } from './Sidebar';

/**
 * The window frame. The splash owns the whole window; every other screen gets
 * the drag strip and the persistent sidebar.
 */
export function RootLayout() {
  const { pathname } = useLocation();

  if (pathname === '/') return <Outlet />;

  return (
    <div className="flex h-full flex-col bg-canvas">
      <div className="h-11 shrink-0 border-b border-line [-webkit-app-region:drag]" />

      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
