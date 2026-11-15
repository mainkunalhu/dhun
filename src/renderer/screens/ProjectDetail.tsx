import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Folder, TriangleAlert } from 'lucide-react';
import type { ProjectSummary } from '../../shared/project';
import { Button, EmptyState } from '../components/ui';
import { formatRelative } from '../lib/format';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    window.dhun.projects
      .get(id ?? '')
      .then((next) => {
        if (!alive) return;
        setProject(next);
      })
      .catch((cause: unknown) => {
        if (!alive) return;
        setProject(null);
        setError(
          cause instanceof Error
            ? cause.message
            : 'Could not open this project.',
        );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="flex h-full flex-col bg-canvas">
      <header className="h-11 shrink-0 border-b border-line [-webkit-app-region:drag]" />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[56rem] px-8 py-10">
          <Link
            to="/projects"
            className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink-strong"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Projects
          </Link>

          {loading ? (
            <p className="mt-8 text-sm text-ink-soft">Opening project…</p>
          ) : project ? (
            <>
              <div className="mt-6 flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink-soft shadow-inset">
                  <Folder className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-semibold tracking-tight text-ink-strong">
                    {project.name}
                  </h1>
                  <p className="text-xs text-ink-soft">
                    Created {formatRelative(project.createdAt)}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <EmptyState
                  icon={<Folder className="size-5" aria-hidden="true" />}
                  title="No script yet"
                >
                  Add a script and a voice to turn this project into a finished
                  voiceover.
                </EmptyState>
              </div>
            </>
          ) : (
            <div className="mt-8">
              <EmptyState
                icon={<TriangleAlert className="size-5" aria-hidden="true" />}
                title="Project not found"
                action={
                  <Button
                    className="mt-2"
                    onClick={() => navigate('/projects')}
                  >
                    Back to projects
                  </Button>
                }
              >
                {error ?? 'This project folder may have been moved or deleted.'}
              </EmptyState>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
