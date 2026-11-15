import { useMemo, useState } from 'react';
import {
  Box,
  Download,
  FolderOpen,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import appIcon from '../../../assets/brand/icon-rounded.png';
import type { ModelSummary } from '../../shared/model';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  IconButton,
  Input,
  Progress,
  Textarea,
} from '../components/ui';
import { Modal } from '../components/Modal';
import { cn } from '../lib/cn';
import { useModelsContext } from '../lib/models-context';

type Filter = 'all' | 'installed' | 'ready';

function formatBytes(bytes: number): string {
  if (!bytes) return '—';

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

function languageLabel(languages: string[]): string {
  if (languages.length === 0) return '—';

  const shown = languages.slice(0, 3).map((code) => code.toUpperCase());
  return languages.length > 3
    ? `${shown.join(' ')} +${languages.length - 3}`
    : shown.join(' ');
}

function voiceLabel(model: ModelSummary): string {
  if (model.voiceMode === 'preset') return 'Preset voices';
  if (model.voiceMode === 'clone') return 'Voice cloning';
  if (model.voiceMode === 'design') return 'Voice design';
  return 'Presets + cloning';
}

export function Models() {
  const { models, loading, error, refresh } = useModelsContext();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [deleting, setDeleting] = useState<ModelSummary | null>(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const installedCount = models.filter((model) => model.installed).length;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return models.filter((model) => {
      if (filter === 'installed' && !model.installed) return false;
      if (filter === 'ready' && model.engineStatus !== 'ready') return false;
      if (!needle) return true;
      return (
        model.name.toLowerCase().includes(needle) ||
        model.repo.toLowerCase().includes(needle) ||
        model.family.toLowerCase().includes(needle)
      );
    });
  }, [models, query, filter]);

  const run = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : 'Something went wrong.',
      );
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setPending(true);
    try {
      await window.dhun.models.remove(deleting.id);
      setDeleting(null);
      await refresh();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : 'Could not delete the model.',
      );
    } finally {
      setPending(false);
    }
  };

  const importModel = async () => {
    setPending(true);
    setImportError(null);
    try {
      await window.dhun.models.importJson(importJson);
      setImportOpen(false);
      setImportJson('');
      await refresh();
    } catch (cause) {
      setImportError(
        cause instanceof Error ? cause.message : 'Could not import that JSON.',
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-canvas">
      <div className="relative min-h-0 flex-1">
        <div
          className="h-full overflow-y-auto"
          onScroll={(event) => {
            const next = event.currentTarget.scrollTop > 0;
            setScrolled((current) => (current === next ? current : next));
          }}
        >
          <div className="mx-auto w-full max-w-[56rem] px-8 pb-10">
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
                        Models
                      </h1>
                      <p className="text-xs tabular-nums text-ink-soft">
                        {installedCount} installed · {models.length} available
                      </p>
                    </div>
                  </div>

                  <Button size="lg" onClick={() => setImportOpen(true)}>
                    <Plus className="size-4" aria-hidden="true" />
                    Import JSON
                  </Button>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-soft"
                      aria-hidden="true"
                    />
                    <Input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search models"
                      aria-label="Search models"
                      className="h-10 pl-10"
                    />
                  </div>

                  <div
                    className="inline-flex h-10 shrink-0 items-center gap-0.5 rounded-lg border border-line bg-surface p-1"
                    role="group"
                    aria-label="Filter models"
                  >
                    {(
                      [
                        ['all', 'All'],
                        ['installed', 'Installed'],
                        ['ready', 'Ready'],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={filter === value}
                        onClick={() => setFilter(value)}
                        className={cn(
                          'h-8 rounded-md px-3.5 text-sm font-medium text-ink-soft transition-colors duration-150 hover:text-ink-strong',
                          filter === value &&
                            'bg-raised text-ink-strong shadow-1',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {scrolled ? (
                <div
                  className="pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-canvas to-transparent"
                  aria-hidden="true"
                />
              ) : null}
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

            {loading ? (
              <div className="flex flex-col gap-3">
                {[0, 1, 2].map((index) => (
                  <div
                    key={index}
                    className="h-[8.5rem] animate-pulse rounded-lg bg-surface"
                  />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <EmptyState
                icon={<Search className="size-5" aria-hidden="true" />}
                title="No models match"
              >
                Try a different search, or import a model from JSON.
              </EmptyState>
            ) : (
              <div className="flex flex-col gap-3">
                {visible.map((model) => {
                  const percent =
                    model.totalBytes > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (model.downloadedBytes / model.totalBytes) * 100,
                          ),
                        )
                      : 0;

                  return (
                    <Card key={model.id} className="flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink-soft shadow-inset">
                          <Box className="size-5" aria-hidden="true" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-sm font-medium text-ink-strong">
                              {model.name}
                            </h2>
                            {model.installed ? (
                              <Badge tone="success">Installed</Badge>
                            ) : null}
                          </div>
                          <p className="truncate font-mono text-xs text-ink-soft">
                            {model.repo}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          {model.installed ? (
                            <>
                              <IconButton
                                label={`Reveal ${model.name}`}
                                onClick={() =>
                                  void run(() =>
                                    window.dhun.models.reveal(model.id),
                                  )
                                }
                              >
                                <FolderOpen className="size-4" />
                              </IconButton>
                              <IconButton
                                label={`Delete ${model.name}`}
                                tone="danger"
                                onClick={() => setDeleting(model)}
                              >
                                <Trash2 className="size-4" />
                              </IconButton>
                            </>
                          ) : model.installing ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                void window.dhun.models.cancel(model.id)
                              }
                            >
                              Cancel
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() =>
                                void run(() =>
                                  window.dhun.models.install(model.id),
                                )
                              }
                            >
                              <Download
                                className="size-3.5"
                                aria-hidden="true"
                              />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge>{model.params}</Badge>
                        <Badge>{languageLabel(model.languages)}</Badge>
                        <Badge>{formatBytes(model.approxSizeBytes)}</Badge>
                        <Badge>{model.license}</Badge>
                        <Badge>{voiceLabel(model)}</Badge>
                      </div>

                      <p className="text-xs leading-[1.55] text-ink-soft">
                        {model.notes}
                      </p>

                      {model.installing ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-xs text-ink-soft">
                            <span className="tabular-nums">
                              {formatBytes(model.downloadedBytes)} of{' '}
                              {formatBytes(model.totalBytes)}
                            </span>
                            <span className="tabular-nums">{percent}%</span>
                          </div>
                          <Progress value={percent} />
                        </div>
                      ) : null}

                      {model.error ? (
                        <p className="flex items-center gap-1.5 text-xs text-danger">
                          <TriangleAlert
                            className="size-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          {model.error}
                        </p>
                      ) : null}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-canvas to-transparent"
          aria-hidden="true"
        />
      </div>

      {deleting ? (
        <Modal
          title="Delete model?"
          description={`${deleting.name} will be removed from disk. You can download it again later.`}
          onClose={() => {
            if (!pending) setDeleting(null);
          }}
        >
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              autoFocus
              disabled={pending}
              onClick={() => setDeleting(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => void remove()}
            >
              {pending ? 'Deleting…' : 'Delete model'}
            </Button>
          </div>
        </Modal>
      ) : null}

      {importOpen ? (
        <Modal
          title="Import a model"
          description="Paste a model entry, an array, or a { models: [] } catalog. The engine must match an adapter in the sidecar."
          onClose={() => {
            if (!pending) {
              setImportOpen(false);
              setImportError(null);
            }
          }}
        >
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (importJson.trim() && !pending) void importModel();
            }}
          >
            <Field label="JSON">
              <Textarea
                autoFocus
                value={importJson}
                onChange={(event) => setImportJson(event.target.value)}
                placeholder={`{
  "id": "my-model",
  "name": "My model",
  "family": "Custom",
  "engine": "kokoro",
  "engineStatus": "ready",
  "repo": "org/model",
  "revision": "main",
  "languages": ["en"],
  "voiceMode": "preset",
  "voices": []
}`}
                className="min-h-[12rem] font-mono text-xs"
              />
            </Field>

            {importError ? (
              <p className="flex items-center gap-1.5 text-xs text-danger">
                <TriangleAlert
                  className="size-3.5 shrink-0"
                  aria-hidden="true"
                />
                {importError}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => setImportOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !importJson.trim()}>
                {pending ? 'Importing…' : 'Import'}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
