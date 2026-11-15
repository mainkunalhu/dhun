import { useEffect } from 'react';
import { useNavigate } from 'react-router';

/**
 * The default landing screen. Opens the last project the user worked on, or
 * the most recent project, and falls back to the project list when empty.
 */
export function StudioRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    const last = localStorage.getItem('dhun.lastProject');

    window.dhun.projects
      .list()
      .then((projects) => {
        if (!alive) return;
        const target =
          projects.find((project) => project.id === last) ?? projects[0];
        navigate(target ? `/projects/${target.id}` : '/library', {
          replace: true,
        });
      })
      .catch(() => {
        if (alive) navigate('/projects', { replace: true });
      });

    return () => {
      alive = false;
    };
  }, [navigate]);

  return (
    <div className="flex h-full items-center justify-center text-sm text-ink-soft">
      Opening studio…
    </div>
  );
}
