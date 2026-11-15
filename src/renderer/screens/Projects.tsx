import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Folder,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import type { ProjectSummary } from '../../shared/project';
import appIcon from '../../../assets/brand/icon-rounded.png';
import { cn } from '../lib/cn';
import { formatRelative } from '../lib/format';
import { useProjects } from '../lib/useProjects';
import { Button, EmptyState, Field, IconButton, Input } from '../components/ui';
import { Modal } from '../components/Modal';

type DialogState =
  | { kind: 'create' }
  | { kind: 'rename'; project: ProjectSummary }
  | { kind: 'delete'; project: ProjectSummary }
  | null;

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Something went wrong.';
}

function projectMeta(project: ProjectSummary): string {
  const updated = formatRelative(project.updatedAt);

  if (project.voices === 0 && project.takes === 0) {
    return `No voices yet · ${updated}`;
  }

  return `${project.voices} ${
    project.voices === 1 ? 'voice' : 'voices'
  } · ${project.takes} ${project.takes === 1 ? 'take' : 'takes'} · ${updated}`;
}

function ProjectRow({
  project,
  onFavorite,
  onRename,
  onDelete,
}: {
  project: ProjectSummary;
  onFavorite: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-4 rounded-xl bg-surface p-4 shadow-1 transition-colors duration-150 hover:bg-raised">
      <Link
        to={`/projects/${project.id}`}
        className="flex min-w-0 flex-1 items-center gap-4"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink-soft shadow-inset">
          <Folder className="size-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-strong">
            {project.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-ink-soft">
            {projectMeta(project)}
          </p>
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-1">
        <IconButton
          label={
            project.favorite
              ? `Remove ${project.name} from favorites`
              : `Add ${project.name} to favorites`
          }
          active={project.favorite}
          onClick={onFavorite}
        >
          <Star className={cn('size-4', project.favorite && 'fill-current')} />
        </IconButton>

        <IconButton label={`Rename ${project.name}`} onClick={onRename}>
          <Pencil className="size-4" />
        </IconButton>

        <IconButton
          label={`Delete ${project.name}`}
          tone="danger"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </IconButton>
      </div>
    </li>
  );
}

function ProjectListSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-3">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-xl bg-surface p-4 shadow-1"
        >
          <span className="size-10 shrink-0 animate-pulse rounded-lg bg-raised" />
          <div className="flex flex-1 flex-col gap-2">
            <span className="h-3 w-40 animate-pulse rounded bg-raised" />
            <span className="h-2.5 w-56 animate-pulse rounded bg-raised" />
          </div>
          <span className="h-7 w-24 shrink-0 animate-pulse rounded-md bg-raised" />
        </div>
      ))}
      <span className="sr-only">Loading projects</span>
    </div>
  );
}

function ProjectNameDialog({
  title,
  description,
  initialName = '',
  submitLabel,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  title: string;
  description: string;
  initialName?: string;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  onSubmit: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const trimmed = name.trim();

  return (
    <Modal title={title} description={description} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (trimmed && !pending) onSubmit(trimmed);
        }}
      >
        <Field label="Project name">
          <Input
            autoFocus
            value={name}
            maxLength={80}
            disabled={pending}
            placeholder="e.g. Week 32 reel"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        {error ? (
          <p className="flex items-center gap-1.5 text-xs text-danger">
            <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending || !trimmed}>
            {pending ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteDialog({
  project,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  project: ProjectSummary;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      title="Delete project?"
      description={`“${project.name}” and everything in its folder will be removed. This can't be undone.`}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        {error ? (
          <p className="flex items-center gap-1.5 text-xs text-danger">
            <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            autoFocus
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? 'Deleting…' : 'Delete project'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function Projects() {
  const { projects, loading, error, refresh } = useProjects();
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<DialogState>(null);
  const [pending, setPending] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter((project) =>
      project.name.toLowerCase().includes(needle),
    );
  }, [projects, query]);

  const isEmpty = !loading && !error && projects.length === 0;
  const noMatches =
    !loading && !error && projects.length > 0 && visible.length === 0;

  const openDialog = (next: DialogState) => {
    setDialogError(null);
    setActionError(null);
    setDialog(next);
  };

  const closeDialog = () => {
    if (pending) return;
    setDialog(null);
    setDialogError(null);
  };

  async function run(
    action: () => Promise<unknown>,
    done: () => Promise<void> | void,
  ) {
    setPending(true);
    setDialogError(null);
    setActionError(null);

    try {
      await action();
      await done();
    } catch (cause) {
      setDialogError(messageOf(cause));
    } finally {
      setPending(false);
    }
  }

  const toggleFavorite = async (project: ProjectSummary) => {
    setActionError(null);
    try {
      await window.dhun.projects.setFavorite(project.id, !project.favorite);
      await refresh();
    } catch (cause) {
      setActionError(messageOf(cause));
    }
  };

  const closeAfterWrite = async () => {
    setDialog(null);
    await refresh();
  };

  function renderDialog() {
    if (!dialog) return null;

    if (dialog.kind === 'create') {
      return (
        <ProjectNameDialog
          title="New project"
          description="Give it a name. A folder is created on disk for the script, voices and takes."
          submitLabel="Create project"
          pending={pending}
          error={dialogError}
          onSubmit={(name) =>
            run(() => window.dhun.projects.create(name), closeAfterWrite)
          }
          onClose={closeDialog}
        />
      );
    }

    const project = dialog.project;

    if (dialog.kind === 'rename') {
      return (
        <ProjectNameDialog
          title="Rename project"
          description="The project folder is renamed to match."
          initialName={project.name}
          submitLabel="Save name"
          pending={pending}
          error={dialogError}
          onSubmit={(name) =>
            run(
              () => window.dhun.projects.rename(project.id, name),
              closeAfterWrite,
            )
          }
          onClose={closeDialog}
        />
      );
    }

    return (
      <DeleteDialog
        project={project}
        pending={pending}
        error={dialogError}
        onConfirm={() =>
          run(() => window.dhun.projects.remove(project.id), closeAfterWrite)
        }
        onClose={closeDialog}
      />
    );
  }

  return (
    <div className="flex h-full flex-col bg-canvas">
      <header className="h-11 shrink-0 border-b border-line [-webkit-app-region:drag]" />

      <div className="relative min-h-0 flex-1">
        <div className="h-full overflow-y-auto">
          <div className="mx-auto w-full max-w-[56rem] px-8 pb-10">
            {/* Top breathing room that scrolls away; header and search stay put. */}
            <div className="h-4" aria-hidden="true" />
            <div className="sticky top-0 z-10 -mx-8 bg-canvas px-8 pt-6 pb-5">
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={appIcon}
                      alt=""
                      width={44}
                      height={44}
                      draggable={false}
                      className="size-11 shrink-0"
                    />
                    <div>
                      <h1 className="text-xl font-semibold tracking-tight text-ink-strong">
                        Projects
                      </h1>
                      <p className="text-xs tabular-nums text-ink-soft">
                        {loading
                          ? 'Loading…'
                          : `${projects.length} ${
                              projects.length === 1 ? 'project' : 'projects'
                            }`}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    onClick={() => openDialog({ kind: 'create' })}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    New project
                  </Button>
                </div>

                {isEmpty || (error && projects.length === 0) ? null : (
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-soft"
                      aria-hidden="true"
                    />
                    <Input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search projects"
                      aria-label="Search projects"
                      disabled={loading}
                      className="h-10 pl-10"
                    />
                  </div>
                )}
              </div>
              <div
                className="pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-canvas to-transparent"
                aria-hidden="true"
              />
            </div>

            {error ? (
              <div className="mb-5 flex items-center gap-2 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
                <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">{error}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void refresh()}
                >
                  Retry
                </Button>
              </div>
            ) : null}

            {actionError ? (
              <div className="mb-5 flex items-center gap-2 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
                <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">{actionError}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActionError(null)}
                >
                  Dismiss
                </Button>
              </div>
            ) : null}

            {isEmpty ? (
              <EmptyState
                icon={<Folder className="size-5" aria-hidden="true" />}
                title="No projects yet"
                action={
                  <Button
                    className="mt-2"
                    onClick={() => openDialog({ kind: 'create' })}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    New project
                  </Button>
                }
              >
                Create a project to keep your script, voices and takes together.
              </EmptyState>
            ) : error && projects.length === 0 ? null : loading ? (
              <ProjectListSkeleton />
            ) : noMatches ? (
              <EmptyState
                icon={<Search className="size-5" aria-hidden="true" />}
                title="No matches"
                action={
                  <Button
                    variant="secondary"
                    className="mt-2"
                    onClick={() => setQuery('')}
                  >
                    Clear search
                  </Button>
                }
              >
                No project matches “{query}”.
              </EmptyState>
            ) : (
              <ul className="flex flex-col gap-3">
                {visible.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    onFavorite={() => void toggleFavorite(project)}
                    onRename={() => openDialog({ kind: 'rename', project })}
                    onDelete={() => openDialog({ kind: 'delete', project })}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-canvas to-transparent"
          aria-hidden="true"
        />
      </div>

      {renderDialog()}
    </div>
  );
}
