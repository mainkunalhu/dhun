import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Check, ChevronDown, Disc3, Folder, Plus, Search } from 'lucide-react';
import type { ProjectSummary } from '../../shared/project';
import { cn } from '../lib/cn';
import { Input } from './ui';

/**
 * The project name in the Studio header doubles as a switcher. It keeps the
 * current project visible, lists everything else on disk, and always offers a
 * way back to the project list.
 */
export function ProjectSwitcher({
  currentId,
  currentName,
  library = false,
  meta,
}: {
  currentId: string;
  currentName: string;
  library?: boolean;
  meta: string;
}) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let alive = true;
    setLoading(true);
    setError(null);

    window.dhun.projects
      .list()
      .then((next) => {
        if (alive) setProjects(next);
      })
      .catch((cause: unknown) => {
        if (!alive) return;
        setError(
          cause instanceof Error ? cause.message : 'Could not read projects.',
        );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [open]);

  const toggle = () => {
    setQuery('');
    setOpen((value) => !value);
  };

  const go = (to: string, isCurrent = false) => {
    setOpen(false);
    if (!isCurrent) navigate(to);
  };

  const needle = query.trim().toLowerCase();
  const libraryMatches = 'library'.includes(needle);
  const filtered = projects.filter((project) =>
    project.name.toLowerCase().includes(needle),
  );

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="project-switcher-panel"
        title="Switch project"
        className="group -ml-2 flex min-w-0 items-center gap-3 rounded-lg py-1 pr-2 pl-2 text-left transition-colors hover:bg-surface"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink-soft shadow-inset">
          {library ? (
            <Disc3 className="size-5" aria-hidden="true" />
          ) : (
            <Folder className="size-5" aria-hidden="true" />
          )}
        </span>

        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-xl font-semibold tracking-tight text-ink-strong">
              {currentName}
            </span>
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-ink-soft transition-transform duration-150 group-hover:text-ink-strong',
                open && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </span>
          <span className="block truncate text-xs text-ink-soft">{meta}</span>
        </span>
      </button>

      {open ? (
        <div
          id="project-switcher-panel"
          role="dialog"
          aria-label="Switch project"
          className="absolute top-full left-0 z-30 mt-2 w-[22rem] overflow-hidden rounded-xl border border-line bg-raised shadow-3"
        >
          <div className="p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-soft"
                aria-hidden="true"
              />
              <Input
                autoFocus
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a project"
                aria-label="Find a project"
                className="h-9 pl-8 text-sm"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto px-1 pb-1">
            {error ? (
              <p className="px-2 py-3 text-xs text-danger">{error}</p>
            ) : loading && projects.length === 0 ? (
              <p className="px-2 py-3 text-xs text-ink-soft">
                Loading projects…
              </p>
            ) : (
              <>
                {libraryMatches ? (
                  <button
                    type="button"
                    onClick={() => go('/library', library)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-surface',
                      library ? 'text-ink-strong' : 'text-ink',
                    )}
                  >
                    <Disc3
                      className="size-4 shrink-0 text-ink-soft"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate">Library</span>
                    {library ? (
                      <Check
                        className="size-4 shrink-0 text-accent-text"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                ) : null}

                {libraryMatches && filtered.length > 0 ? (
                  <div className="my-1 h-px bg-line" aria-hidden="true" />
                ) : null}

                {filtered.map((project) => {
                  const isCurrent = project.id === currentId;
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => go(`/projects/${project.id}`, isCurrent)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-surface',
                        isCurrent ? 'text-ink-strong' : 'text-ink',
                      )}
                    >
                      <Folder
                        className="size-4 shrink-0 text-ink-soft"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {project.name}
                      </span>
                      {isCurrent ? (
                        <Check
                          className="size-4 shrink-0 text-accent-text"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  );
                })}

                {!libraryMatches && filtered.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-ink-soft">
                    {needle
                      ? 'No projects match that search.'
                      : 'No projects yet.'}
                  </p>
                ) : null}
              </>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-line px-3 py-2">
            <Link
              to="/projects"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-ink-soft transition-colors hover:text-ink-strong"
            >
              All projects
            </Link>
            <Link
              to="/projects?new=1"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent-text transition-colors hover:underline"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              New project
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
