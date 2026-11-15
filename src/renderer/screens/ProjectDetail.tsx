import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  AudioLines,
  Folder,
  Pause,
  Play,
  RotateCcw,
  TriangleAlert,
  X,
} from 'lucide-react';
import type { JobStatus } from '../../shared/job';
import type { ProjectSettings, ProjectSummary } from '../../shared/project';
import {
  Badge,
  Button,
  Card,
  Field,
  IconButton,
  Progress,
  SectionLabel,
  Select,
  Textarea,
} from '../components/ui';
import { formatRelative } from '../lib/format';
import { useJobs } from '../lib/useJobs';
import { useModelsContext } from '../lib/models-context';

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

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { models, loading: modelsLoading } = useModelsContext();
  const { jobs, refresh: refreshJobs } = useJobs(id);

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
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackMs, setPlaybackMs] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastSavedScript = useRef('');
  const lastSavedSettings = useRef('');

  useEffect(() => {
    let alive = true;
    setLoading(true);

    window.dhun.projects
      .get(id ?? '')
      .then((next) => {
        if (!alive) return;
        lastSavedScript.current = next.script;
        lastSavedSettings.current = JSON.stringify(next.settings);
        setProject(next);
        setScript(next.script);
        setSettings(next.settings);
        setError(null);

        try {
          localStorage.setItem('dhun.lastProject', next.id);
        } catch {
          /* storage can be unavailable */
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
  }, [id]);

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
        modelId: selectedModel.id,
        voiceId: selectedVoice.id,
        language,
        speed: settings.speed,
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
    if (!project) return;
    try {
      await window.dhun.jobs.cancel(project.id, jobId);
      await refreshJobs();
    } catch {
      await refreshJobs();
    }
  };

  const retryJob = async (jobId: string) => {
    if (!project) return;
    setActionError(null);
    try {
      await window.dhun.jobs.retry(project.id, jobId);
      await refreshJobs();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : 'Could not retry that take.',
      );
    }
  };

  const togglePlay = (jobId: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playingId === jobId) {
      audio.pause();
      setPlayingId(null);
      return;
    }

    audio.src = `dhun-media://renders/${jobId}.wav`;
    audio.currentTime = 0;
    setPlaybackProgress(0);
    setPlaybackMs(0);

    void audio
      .play()
      .then(() => setPlayingId(jobId))
      .catch(() => {
        setActionError('Could not play that take.');
        setPlayingId(null);
      });
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
              <div className="flex min-w-0 items-center gap-3">
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

              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <Card className="flex flex-col gap-3">
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
                    <span>Saved to the project folder</span>
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

                <Card className="flex flex-col gap-4">
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

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-sm text-ink">
                      <span>Speed</span>
                      <span className="tabular-nums text-ink-soft">
                        {settings.speed.toFixed(2)}×
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={1.5}
                      step={0.05}
                      value={settings.speed}
                      onChange={(event) =>
                        updateSettings({ speed: Number(event.target.value) })
                      }
                      aria-label="Speed"
                      className="h-1.5 w-full cursor-pointer accent-accent"
                    />
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

                      return (
                        <li
                          key={job.id}
                          title={job.error ?? job.script}
                          className="flex items-center gap-4 rounded-xl bg-surface p-4 shadow-1"
                        >
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink-soft shadow-inset">
                            <AudioLines className="size-5" aria-hidden="true" />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-medium text-ink-strong">
                                {voice?.name ?? job.voiceId}
                              </p>
                              <Badge tone={statusTone(job.status)}>
                                {job.status}
                              </Badge>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-ink-soft">
                              {model?.name ?? job.modelId} ·{' '}
                              {job.language.toUpperCase()} ·{' '}
                              {job.speed.toFixed(2)}×
                            </p>

                            {job.status === 'running' ? (
                              <div className="mt-2 flex items-center gap-2">
                                <Progress value={job.progress} />
                                <span className="w-9 shrink-0 text-right text-xs tabular-nums text-ink-soft">
                                  {job.progress}%
                                </span>
                              </div>
                            ) : null}

                            {playingId === job.id ? (
                              <div className="mt-2 flex items-center gap-2">
                                <Progress value={playbackProgress} />
                                <span className="w-9 shrink-0 text-right text-xs tabular-nums text-ink-soft">
                                  {formatDuration(playbackMs)}
                                </span>
                              </div>
                            ) : null}
                          </div>

                          <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-ink-soft">
                            {job.durationMs
                              ? formatDuration(job.durationMs)
                              : '—'}
                          </span>

                          <div className="flex shrink-0 items-center gap-1">
                            {job.status === 'done' ? (
                              <IconButton
                                label={
                                  playingId === job.id
                                    ? 'Pause take'
                                    : 'Play take'
                                }
                                active={playingId === job.id}
                                onClick={() => togglePlay(job.id)}
                              >
                                {playingId === job.id ? (
                                  <Pause className="size-4" />
                                ) : (
                                  <Play className="size-4" />
                                )}
                              </IconButton>
                            ) : null}

                            {job.status === 'failed' ||
                            job.status === 'canceled' ? (
                              <IconButton
                                label="Retry take"
                                onClick={() => void retryJob(job.id)}
                              >
                                <RotateCcw className="size-4" />
                              </IconButton>
                            ) : null}

                            {job.status === 'queued' ||
                            job.status === 'running' ? (
                              <IconButton
                                label="Cancel take"
                                onClick={() => void cancelJob(job.id)}
                              >
                                <X className="size-4" />
                              </IconButton>
                            ) : null}
                          </div>
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

      <audio
        ref={audioRef}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          if (audio.duration) {
            setPlaybackProgress((audio.currentTime / audio.duration) * 100);
            setPlaybackMs(audio.currentTime * 1000);
          }
        }}
        onEnded={() => {
          setPlayingId(null);
          setPlaybackProgress(0);
          setPlaybackMs(0);
        }}
        className="hidden"
      />
    </div>
  );
}
