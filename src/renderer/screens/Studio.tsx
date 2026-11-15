import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  AudioLines,
  Disc3,
  Download,
  Folder,
  FolderInput,
  Pause,
  Pencil,
  Play,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import type { Job, JobStatus } from '../../shared/job';
import {
  LIBRARY_PROJECT_ID,
  type ProjectSettings,
  type ProjectSummary,
} from '../../shared/project';
import {
  Badge,
  Button,
  Card,
  Field,
  IconButton,
  Input,
  Progress,
  SectionLabel,
  Select,
  Textarea,
} from '../components/ui';
import { Modal } from '../components/Modal';
import { ProjectSwitcher } from '../components/ProjectSwitcher';
import { cn } from '../lib/cn';
import { formatRelative } from '../lib/format';
import { useJobs } from '../lib/useJobs';
import { useModelsContext } from '../lib/models-context';
import { usePlayer } from '../lib/player';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  pl: 'Polish',
  tr: 'Turkish',
  ru: 'Russian',
  nl: 'Dutch',
  cs: 'Czech',
  ar: 'Arabic',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  hu: 'Hungarian',
  fi: 'Finnish',
  no: 'Norwegian',
  da: 'Danish',
  he: 'Hebrew',
  ms: 'Malay',
  sv: 'Swedish',
};

function languageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code.toUpperCase();
}

function statusTone(
  status: JobStatus,
): 'neutral' | 'accent' | 'success' | 'danger' | 'info' {
  switch (status) {
    case 'running':
      return 'accent';
    case 'done':
      return 'success';
    case 'failed':
      return 'danger';
    case 'canceled':
      return 'neutral';
    default:
      return 'info';
  }
}

const STATUS_LABELS: Record<JobStatus, string> = {
  queued: 'Queued',
  running: 'Rendering',
  done: 'Ready',
  failed: 'Failed',
  canceled: 'Canceled',
};

/** Four little bars that move while a take is rendering. */
function ActivityBars() {
  const heights = [7, 14, 10, 5];

  return (
    <span className="flex h-4 items-end gap-[3px]" aria-hidden="true">
      {heights.map((height, index) => (
        <span
          key={index}
          className="w-[3px] origin-bottom animate-[dhun-level_900ms_ease-in-out_infinite] rounded-full bg-accent"
          style={{
            height: `${height}px`,
            animationDelay: `${index * 120}ms`,
          }}
        />
      ))}
    </span>
  );
}

function wordCount(script: string): number {
  const trimmed = script.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function estimate(words: number): string {
  const seconds = Math.round((words / 150) * 60);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Avoid reusing a name after a take has been deleted. */
function nextTakeName(jobs: Job[]): string {
  const used = new Set(
    jobs.map((job) => job.name.trim().toLowerCase()).filter(Boolean),
  );
  let number = jobs.length + 1;
  while (used.has(`take ${number}`)) number += 1;
  return `Take ${number}`;
}

export function Studio({
  projectId,
  library = false,
}: {
  projectId: string;
  library?: boolean;
}) {
  const navigate = useNavigate();
  const player = usePlayer();
  const { models, loading: modelsLoading } = useModelsContext();
  const { jobs, refresh: refreshJobs } = useJobs(projectId);

  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState('');
  const [settings, setSettings] = useState<ProjectSettings>({
    modelId: null,
    voiceId: null,
    language: 'en',
    speed: 1,
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [moving, setMoving] = useState<Job | null>(null);
  const [moveTargets, setMoveTargets] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [moveQuery, setMoveQuery] = useState('');
  const [deleting, setDeleting] = useState<Job | null>(null);
  const [renaming, setRenaming] = useState<Job | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [dialogPending, setDialogPending] = useState(false);
  const lastSavedScript = useRef('');
  const lastSavedSettings = useRef('');

  useEffect(() => {
    let alive = true;
    setLoading(true);

    window.dhun.projects
      .get(projectId)
      .then((next) => {
        if (!alive) return;
        lastSavedScript.current = next.script;
        lastSavedSettings.current = JSON.stringify(next.settings);
        setProject(next);
        setScript(next.script);
        setSettings(next.settings);
        setError(null);

        if (!library) {
          try {
            localStorage.setItem('dhun.lastProject', next.id);
          } catch {
            /* storage can be unavailable */
          }
        }
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
  }, [projectId, library]);

  useEffect(() => {
    if (!project || script === lastSavedScript.current) return;

    const timer = window.setTimeout(async () => {
      setSaving(true);
      setSaveError(null);
      try {
        await window.dhun.projects.saveScript(project.id, script);
        lastSavedScript.current = script;
        setSavedAt(Date.now());
      } catch (cause) {
        setSaveError(
          cause instanceof Error ? cause.message : 'Could not save the script.',
        );
      } finally {
        setSaving(false);
      }
    }, 600);

    return () => window.clearTimeout(timer);
  }, [script, project]);

  useEffect(() => {
    if (!project) return;

    const serialized = JSON.stringify(settings);
    if (serialized === lastSavedSettings.current) return;

    const timer = window.setTimeout(async () => {
      setSaving(true);
      setSaveError(null);
      try {
        await window.dhun.projects.saveSettings(project.id, settings);
        lastSavedSettings.current = serialized;
        setSavedAt(Date.now());
      } catch (cause) {
        setSaveError(
          cause instanceof Error
            ? cause.message
            : 'Could not save the voice settings.',
        );
      } finally {
        setSaving(false);
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [settings, project]);

  useEffect(() => {
    if (!moving) return;

    let alive = true;
    window.dhun.projects
      .list()
      .then((projects) => {
        if (!alive) return;
        const targets: Array<{ id: string; name: string }> = [];

        if (!library) {
          targets.push({ id: LIBRARY_PROJECT_ID, name: 'Library' });
        }

        targets.push(
          ...projects
            .filter((item) => item.id !== projectId)
            .map((item) => ({ id: item.id, name: item.name })),
        );

        setMoveTargets(targets);
      })
      .catch(() => {
        if (alive) setMoveTargets([]);
      });

    return () => {
      alive = false;
    };
  }, [moving, projectId, library]);

  const installed = useMemo(
    () =>
      models.filter(
        (model) => model.installed && model.engineStatus === 'ready',
      ),
    [models],
  );

  const selectedModel =
    installed.find((model) => model.id === settings.modelId) ??
    installed[0] ??
    null;

  const language =
    selectedModel && selectedModel.languages.includes(settings.language)
      ? settings.language
      : (selectedModel?.languages[0] ?? 'en');

  const voices = selectedModel?.voices ?? [];
  const languageVoices = voices.filter((voice) => voice.language === language);
  const voiceOptions = languageVoices.length > 0 ? languageVoices : voices;
  const selectedVoice =
    voiceOptions.find((voice) => voice.id === settings.voiceId) ??
    voiceOptions[0] ??
    null;

  const words = wordCount(script);
  const canGenerate = Boolean(
    project && script.trim() && selectedModel && selectedVoice && !generating,
  );
  const moveNeedle = moveQuery.trim().toLowerCase();
  const visibleMoveTargets = moveTargets.filter((target) =>
    target.name.toLowerCase().includes(moveNeedle),
  );

  const updateSettings = (patch: Partial<ProjectSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const chooseModel = (modelId: string) => {
    const model = installed.find((item) => item.id === modelId);
    if (!model) return;

    const nextLanguage = model.languages[0] ?? 'en';
    const nextVoice =
      model.voices.find((voice) => voice.language === nextLanguage) ??
      model.voices[0];

    updateSettings({
      modelId,
      language: nextLanguage,
      voiceId: nextVoice?.id ?? null,
    });
  };

  const chooseLanguage = (nextLanguage: string) => {
    const nextVoice =
      selectedModel?.voices.find((voice) => voice.language === nextLanguage) ??
      selectedModel?.voices[0];

    updateSettings({
      language: nextLanguage,
      voiceId: nextVoice?.id ?? null,
    });
  };

  const generate = async () => {
    if (!project || !selectedModel || !selectedVoice) return;

    setGenerating(true);
    setActionError(null);

    try {
      await window.dhun.jobs.create(project.id, {
        name: nextTakeName(jobs),
        modelId: selectedModel.id,
        voiceId: selectedVoice.id,
        language,
        speed: 1,
        script,
      });
      await refreshJobs();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : 'Could not queue the render.',
      );
    } finally {
      setGenerating(false);
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      await window.dhun.jobs.cancel(projectId, jobId);
      await refreshJobs();
    } catch {
      await refreshJobs();
    }
  };

  const retryJob = async (jobId: string) => {
    setActionError(null);
    try {
      await window.dhun.jobs.retry(projectId, jobId);
      await refreshJobs();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : 'Could not retry that take.',
      );
    }
  };

  const moveTake = async (targetId: string) => {
    if (!moving) return;
    setDialogPending(true);
    setActionError(null);

    try {
      await window.dhun.jobs.move(projectId, targetId, moving.id);
      setMoving(null);
      await refreshJobs();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : 'Could not move that take.',
      );
    } finally {
      setDialogPending(false);
    }
  };

  const deleteTake = async () => {
    if (!deleting) return;
    setDialogPending(true);
    setActionError(null);

    try {
      await window.dhun.jobs.remove(projectId, deleting.id);
      if (player.current?.id === deleting.id) player.stop();
      setDeleting(null);
      await refreshJobs();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : 'Could not delete that take.',
      );
    } finally {
      setDialogPending(false);
    }
  };

  const renameTake = async () => {
    if (!renaming) return;
    setDialogPending(true);
    setActionError(null);

    try {
      await window.dhun.jobs.rename(projectId, renaming.id, renameValue);
      setRenaming(null);
      await refreshJobs();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : 'Could not rename that take.',
      );
    } finally {
      setDialogPending(false);
    }
  };

  const exportTake = async (job: Job) => {
    setActionError(null);
    try {
      await window.dhun.jobs.export(projectId, job.id);
      setNotice('Exported to Downloads');
      window.setTimeout(() => setNotice(null), 4000);
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : 'Could not export that take.',
      );
    }
  };

  return (
    <div className="flex h-full flex-col bg-canvas">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[68rem] flex-col gap-6 px-8 py-10">
          {loading ? (
            <p className="text-sm text-ink-soft">Opening project…</p>
          ) : !project ? (
            <div className="flex flex-col items-start gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-ink-strong">
                Project not found
              </h1>
              <p className="text-sm text-ink-soft">
                {error ?? 'This project folder may have been moved or deleted.'}
              </p>
              <Button onClick={() => navigate('/projects')}>
                Back to projects
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <ProjectSwitcher
                  currentId={project.id}
                  currentName={library ? 'Library' : project.name}
                  library={library}
                  meta={
                    library
                      ? 'Takes that are not attached to a project'
                      : `Created ${formatRelative(project.createdAt)}`
                  }
                />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/projects')}
                  title="Close this project"
                >
                  <X className="size-4" aria-hidden="true" />
                  Close
                </Button>
              </div>

              {!modelsLoading && installed.length === 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
                  <TriangleAlert
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>No model installed.</span>
                  <Link to="/models" className="font-medium underline">
                    Download a model
                  </Link>
                  <span>to generate a voiceover.</span>
                </div>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <Card className="flex h-full flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <SectionLabel>Script</SectionLabel>
                    <span className="text-xs tabular-nums text-ink-soft">
                      {words} {words === 1 ? 'word' : 'words'} · ~
                      {estimate(words)}
                    </span>
                  </div>

                  <Textarea
                    value={script}
                    onChange={(event) => setScript(event.target.value)}
                    placeholder="Paste your script here. Blank lines separate segments."
                    aria-label="Script"
                    className="h-[22rem] resize-none overflow-y-auto border-line bg-canvas px-4 py-3 text-base leading-[1.7]"
                  />

                  <div className="flex items-center justify-between text-xs text-ink-soft">
                    <span>
                      {library
                        ? 'Saved in the library'
                        : 'Saved to the project folder'}
                    </span>
                    <span>
                      {saveError ? (
                        <span className="text-danger">{saveError}</span>
                      ) : saving ? (
                        'Saving…'
                      ) : savedAt ? (
                        'Saved'
                      ) : (
                        'Autosaves'
                      )}
                    </span>
                  </div>
                </Card>

                <Card className="flex h-full flex-col gap-4">
                  <SectionLabel>Render settings</SectionLabel>

                  <Field label="Model">
                    <Select
                      value={selectedModel?.id ?? ''}
                      onChange={(event) => chooseModel(event.target.value)}
                      disabled={installed.length === 0}
                    >
                      {installed.length === 0 ? (
                        <option value="">No models installed</option>
                      ) : (
                        installed.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                          </option>
                        ))
                      )}
                    </Select>
                  </Field>

                  <Field
                    label="Voice"
                    hint={
                      selectedVoice?.prompt
                        ? selectedVoice.prompt.length > 100
                          ? `${selectedVoice.prompt.slice(0, 97)}…`
                          : selectedVoice.prompt
                        : selectedModel?.voiceMode === 'clone'
                          ? 'Cloned voices land with the voice library.'
                          : undefined
                    }
                  >
                    <Select
                      value={selectedVoice?.id ?? ''}
                      onChange={(event) =>
                        updateSettings({ voiceId: event.target.value })
                      }
                      disabled={voiceOptions.length === 0}
                    >
                      {voiceOptions.length === 0 ? (
                        <option value="">No voices</option>
                      ) : (
                        voiceOptions.map((voice) => (
                          <option key={voice.id} value={voice.id}>
                            {voice.name} · {voice.language.toUpperCase()}
                          </option>
                        ))
                      )}
                    </Select>
                  </Field>

                  <Field label="Language">
                    <Select
                      value={language}
                      onChange={(event) => chooseLanguage(event.target.value)}
                      disabled={!selectedModel}
                    >
                      {(selectedModel?.languages ?? ['en']).map((code) => (
                        <option key={code} value={code}>
                          {languageName(code)}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <div className="mt-auto flex flex-col gap-3">
                    <div className="flex items-center justify-between text-xs text-ink-soft">
                      <span>Runs locally</span>
                      <span className="font-mono">WAV</span>
                    </div>

                    <Button
                      block
                      onClick={() => void generate()}
                      disabled={!canGenerate}
                    >
                      {generating ? 'Adding to queue…' : 'Generate'}
                    </Button>

                    {actionError ? (
                      <p className="text-xs text-danger">{actionError}</p>
                    ) : null}
                  </div>
                </Card>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SectionLabel>Takes</SectionLabel>
                    <Badge className="tabular-nums">{jobs.length}</Badge>
                  </div>
                  <span className="text-xs text-ink-soft">One at a time</span>
                </div>

                {notice ? (
                  <p className="text-xs text-success">{notice}</p>
                ) : null}

                {jobs.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line-strong px-6 py-10 text-center text-xs text-ink-soft">
                    No takes yet. Generate a voice to see it here.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {jobs.map((job) => {
                      const model = models.find(
                        (item) => item.id === job.modelId,
                      );
                      const voice = model?.voices.find(
                        (item) => item.id === job.voiceId,
                      );
                      const isPlaying =
                        player.current?.id === job.id && player.playing;

                      return (
                        <li
                          key={job.id}
                          title={job.error ?? job.script}
                          className={cn(
                            'overflow-hidden rounded-xl bg-surface shadow-1 transition-shadow',
                            job.status === 'running' && 'ring-1 ring-accent/25',
                          )}
                        >
                          <div className="flex items-center gap-4 p-4">
                            <span
                              className={cn(
                                'flex size-10 shrink-0 items-center justify-center rounded-lg shadow-inset transition-colors',
                                job.status === 'running'
                                  ? 'bg-accent-soft text-accent-text'
                                  : 'bg-sunken text-ink-soft',
                              )}
                            >
                              {job.status === 'running' ? (
                                <ActivityBars />
                              ) : (
                                <AudioLines
                                  className="size-5"
                                  aria-hidden="true"
                                />
                              )}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-medium text-ink-strong">
                                  {job.name || voice?.name || job.voiceId}
                                </p>
                                <Badge tone={statusTone(job.status)}>
                                  {STATUS_LABELS[job.status]}
                                </Badge>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-ink-soft">
                                {voice?.name ?? job.voiceId} ·{' '}
                                {model?.name ?? job.modelId} ·{' '}
                                {job.language.toUpperCase()}
                              </p>
                            </div>

                            {job.durationMs ? (
                              <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-ink-soft">
                                {formatDuration(job.durationMs)}
                              </span>
                            ) : null}

                            <div className="flex shrink-0 items-center gap-1">
                              {job.status === 'done' ? (
                                <IconButton
                                  label={isPlaying ? 'Pause take' : 'Play take'}
                                  active={isPlaying}
                                  onClick={() =>
                                    player.play({
                                      id: job.id,
                                      title:
                                        job.name || voice?.name || job.voiceId,
                                      subtitle: `${voice?.name ?? job.voiceId} · ${model?.name ?? job.modelId} · ${job.language.toUpperCase()}`,
                                      durationMs: job.durationMs ?? 0,
                                    })
                                  }
                                >
                                  {isPlaying ? (
                                    <Pause className="size-4" />
                                  ) : (
                                    <Play className="size-4" />
                                  )}
                                </IconButton>
                              ) : null}

                              {job.status === 'done' ||
                              job.status === 'failed' ||
                              job.status === 'canceled' ? (
                                <>
                                  <IconButton
                                    label="Rename take"
                                    onClick={() => {
                                      setActionError(null);
                                      setRenameValue(
                                        job.name || voice?.name || '',
                                      );
                                      setRenaming(job);
                                    }}
                                  >
                                    <Pencil className="size-4" />
                                  </IconButton>

                                  {job.status === 'done' ? (
                                    <IconButton
                                      label="Export take"
                                      onClick={() => void exportTake(job)}
                                    >
                                      <Download className="size-4" />
                                    </IconButton>
                                  ) : null}

                                  <IconButton
                                    label="Move take"
                                    onClick={() => {
                                      setActionError(null);
                                      setMoveQuery('');
                                      setMoving(job);
                                    }}
                                  >
                                    <FolderInput className="size-4" />
                                  </IconButton>
                                  <IconButton
                                    label="Delete take"
                                    tone="danger"
                                    onClick={() => {
                                      setActionError(null);
                                      setDeleting(job);
                                    }}
                                  >
                                    <Trash2 className="size-4" />
                                  </IconButton>
                                </>
                              ) : null}

                              {job.status === 'queued' ||
                              job.status === 'running' ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => void cancelJob(job.id)}
                                >
                                  Cancel
                                </Button>
                              ) : null}

                              {job.status === 'failed' ||
                              job.status === 'canceled' ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => void retryJob(job.id)}
                                >
                                  Retry
                                </Button>
                              ) : null}
                            </div>
                          </div>

                          {job.status === 'running' ? (
                            <div className="flex items-center gap-3 border-t border-line px-4 py-2.5">
                              <Progress value={job.progress} />
                              <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-accent-text">
                                {job.progress}%
                              </span>
                            </div>
                          ) : job.status === 'queued' ? (
                            <div className="flex items-center gap-2 border-t border-line px-4 py-2.5">
                              <span
                                className="size-1.5 animate-pulse rounded-full bg-ink-faint"
                                aria-hidden="true"
                              />
                              <span className="text-xs text-ink-soft">
                                Waiting for the current render to finish
                              </span>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {moving ? (
        <Modal
          title="Move take"
          description="Choose where this take should live."
          onClose={() => {
            if (!dialogPending) setMoving(null);
          }}
        >
          <div className="flex flex-col gap-3">
            {moveTargets.length > 0 ? (
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-soft"
                  aria-hidden="true"
                />
                <Input
                  autoFocus
                  type="search"
                  value={moveQuery}
                  onChange={(event) => setMoveQuery(event.target.value)}
                  placeholder="Find a project"
                  aria-label="Find a project"
                  disabled={dialogPending}
                  className="h-9 pl-8 text-sm"
                />
              </div>
            ) : null}

            <div className="-mx-1 flex max-h-64 flex-col gap-0.5 overflow-y-auto px-1">
              {moveTargets.length === 0 ? (
                <p className="px-2 py-2 text-sm text-ink-soft">
                  No other projects yet. Create one first.
                </p>
              ) : visibleMoveTargets.length === 0 ? (
                <p className="px-2 py-2 text-sm text-ink-soft">
                  No projects match that search.
                </p>
              ) : (
                visibleMoveTargets.map((target) => (
                  <button
                    key={target.id}
                    type="button"
                    disabled={dialogPending}
                    onClick={() => void moveTake(target.id)}
                    className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-left text-sm text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:text-ink-faint"
                  >
                    {target.id === LIBRARY_PROJECT_ID ? (
                      <Disc3
                        className="size-4 shrink-0 text-ink-soft"
                        aria-hidden="true"
                      />
                    ) : (
                      <Folder
                        className="size-4 shrink-0 text-ink-soft"
                        aria-hidden="true"
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {target.name}
                    </span>
                  </button>
                ))
              )}
            </div>

            {actionError ? (
              <p className="text-xs text-danger">{actionError}</p>
            ) : null}

            <div className="flex justify-end border-t border-line pt-3">
              <Button
                variant="ghost"
                disabled={dialogPending}
                onClick={() => setMoving(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {renaming ? (
        <Modal
          title="Name this take"
          description="A name you'll recognise in the library."
          onClose={() => {
            if (!dialogPending) setRenaming(null);
          }}
        >
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (renameValue.trim() && !dialogPending) void renameTake();
            }}
          >
            <Field label="Take name">
              <Input
                autoFocus
                value={renameValue}
                maxLength={80}
                disabled={dialogPending}
                onChange={(event) => setRenameValue(event.target.value)}
              />
            </Field>

            {actionError ? (
              <p className="text-xs text-danger">{actionError}</p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                disabled={dialogPending}
                onClick={() => setRenaming(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={dialogPending || !renameValue.trim()}
              >
                Save name
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleting ? (
        <Modal
          title="Delete take?"
          description="The audio file is removed too. This can't be undone."
          onClose={() => {
            if (!dialogPending) setDeleting(null);
          }}
        >
          <div className="flex flex-col gap-4">
            {actionError ? (
              <p className="text-xs text-danger">{actionError}</p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                autoFocus
                disabled={dialogPending}
                onClick={() => setDeleting(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={dialogPending}
                onClick={() => void deleteTake()}
              >
                {dialogPending ? 'Deleting…' : 'Delete take'}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export function ProjectStudio() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <Studio projectId={id} />;
}

export function LibraryStudio() {
  return <Studio projectId={LIBRARY_PROJECT_ID} library />;
}
