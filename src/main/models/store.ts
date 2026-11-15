import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { shell } from 'electron';
import shippedCatalog from '../../../catalog/models.json';
import type {
  CatalogModel,
  ModelProgress,
  ModelSummary,
  ModelVoice,
} from '../../shared/model';
import { downloadModel } from './download';

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

type DownloadState = {
  controller: AbortController;
  downloadedBytes: number;
  totalBytes: number;
  error: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required.`);
  }
  return value.trim();
}

function asNumber(value: unknown, field: string, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function parseVoice(value: unknown, index: number): ModelVoice {
  if (!isRecord(value)) throw new Error(`voices[${index}] is invalid.`);

  return {
    id: asString(value.id, `voices[${index}].id`),
    name: asString(value.name, `voices[${index}].name`),
    language: asString(value.language, `voices[${index}].language`),
    gender:
      value.gender === 'female' || value.gender === 'male'
        ? value.gender
        : undefined,
    prompt: typeof value.prompt === 'string' ? value.prompt : undefined,
  };
}

function parseModel(value: unknown): CatalogModel {
  if (!isRecord(value)) throw new Error('A model must be an object.');

  const id = asString(value.id, 'id');
  if (!ID_PATTERN.test(id)) {
    throw new Error(
      'id must be lowercase letters, numbers and dashes (max 64).',
    );
  }

  const repo = asString(value.repo, 'repo');
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw new Error('repo must look like "org/model".');
  }

  const engineStatus =
    value.engineStatus === 'ready' || value.engineStatus === 'planned'
      ? value.engineStatus
      : 'planned';

  const voiceMode =
    value.voiceMode === 'preset' ||
    value.voiceMode === 'clone' ||
    value.voiceMode === 'design' ||
    value.voiceMode === 'both'
      ? value.voiceMode
      : 'preset';

  const languages = Array.isArray(value.languages)
    ? value.languages.filter((item): item is string => typeof item === 'string')
    : [];

  const voices = Array.isArray(value.voices)
    ? value.voices.map(parseVoice)
    : [];

  return {
    id,
    name: asString(value.name, 'name'),
    family: asString(value.family, 'family'),
    engine: asString(value.engine, 'engine'),
    engineStatus,
    repo,
    revision: typeof value.revision === 'string' ? value.revision : 'main',
    params: typeof value.params === 'string' ? value.params : '—',
    languages,
    voiceMode,
    voices,
    license: typeof value.license === 'string' ? value.license : 'Unknown',
    approxSizeBytes: asNumber(value.approxSizeBytes, 'approxSizeBytes'),
    minRamGb: asNumber(value.minRamGb, 'minRamGb', 2),
    notes: typeof value.notes === 'string' ? value.notes : '',
  };
}

function readImport(json: string): CatalogModel[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('That is not valid JSON.');
  }

  if (Array.isArray(parsed)) return parsed.map(parseModel);
  if (isRecord(parsed) && Array.isArray(parsed.models)) {
    return parsed.models.map(parseModel);
  }
  return [parseModel(parsed)];
}

export function createModelManager({
  modelsRoot,
  localCatalogPath,
  onProgress,
}: {
  modelsRoot: string;
  localCatalogPath: string;
  onProgress: (progress: ModelProgress) => void;
}) {
  const downloads = new Map<string, DownloadState>();

  async function readLocalCatalog(): Promise<CatalogModel[]> {
    try {
      const raw = await readFile(localCatalogPath, 'utf8');
      const parsed = JSON.parse(raw) as { models?: unknown[] };
      return Array.isArray(parsed.models) ? parsed.models.map(parseModel) : [];
    } catch {
      return [];
    }
  }

  async function catalog(): Promise<CatalogModel[]> {
    const shipped = (shippedCatalog.models as unknown[]).map(parseModel);
    const local = await readLocalCatalog();
    const byId = new Map<string, CatalogModel>();

    for (const model of [...shipped, ...local]) byId.set(model.id, model);
    return [...byId.values()];
  }

  function modelDir(id: string): string {
    return path.join(modelsRoot, id);
  }

  function isInstalled(id: string): boolean {
    return existsSync(path.join(modelDir(id), 'manifest.json'));
  }

  async function list(): Promise<ModelSummary[]> {
    const models = await catalog();

    return models
      .map((model) => {
        const state = downloads.get(model.id);
        return {
          ...model,
          installed: isInstalled(model.id),
          installing: Boolean(state),
          downloadedBytes: state?.downloadedBytes ?? 0,
          totalBytes: state?.totalBytes ?? model.approxSizeBytes,
          error: state?.error ?? null,
        };
      })
      .sort((a, b) => {
        if (a.installed !== b.installed) return a.installed ? -1 : 1;
        if (a.engineStatus !== b.engineStatus) {
          return a.engineStatus === 'ready' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }

  async function find(id: string): Promise<CatalogModel> {
    if (!ID_PATTERN.test(id)) throw new Error('Invalid model id.');
    const model = (await catalog()).find((item) => item.id === id);
    if (!model) throw new Error('Model not found.');
    return model;
  }

  async function install(id: string): Promise<void> {
    const model = await find(id);

    if (model.engineStatus !== 'ready') {
      throw new Error(`${model.name} has no engine adapter yet.`);
    }
    if (isInstalled(id) || downloads.has(id)) return;

    const controller = new AbortController();
    const state: DownloadState = {
      controller,
      downloadedBytes: 0,
      totalBytes: model.approxSizeBytes,
      error: null,
    };
    downloads.set(id, state);

    const target = modelDir(id);
    await rm(target, { recursive: true, force: true });

    const report = () => {
      onProgress({
        id,
        status: 'downloading',
        downloadedBytes: state.downloadedBytes,
        totalBytes: state.totalBytes,
      });
    };

    report();

    void downloadModel(
      model,
      target,
      (downloaded, total) => {
        state.downloadedBytes = downloaded;
        state.totalBytes = total;
        report();
      },
      controller.signal,
    )
      .then(() => {
        downloads.delete(id);
        onProgress({
          id,
          status: 'installed',
          downloadedBytes: state.totalBytes,
          totalBytes: state.totalBytes,
        });
      })
      .catch(async (cause: unknown) => {
        const canceled = controller.signal.aborted;
        downloads.delete(id);
        await rm(target, { recursive: true, force: true });

        onProgress({
          id,
          status: canceled ? 'canceled' : 'error',
          downloadedBytes: 0,
          totalBytes: state.totalBytes,
          error: canceled
            ? undefined
            : cause instanceof Error
              ? cause.message
              : 'Download failed.',
        });
      });
  }

  async function cancel(id: string): Promise<void> {
    downloads.get(id)?.controller.abort();
  }

  async function remove(id: string): Promise<void> {
    if (downloads.has(id)) {
      downloads.get(id)?.controller.abort();
      return;
    }
    if (!ID_PATTERN.test(id)) throw new Error('Invalid model id.');
    await rm(modelDir(id), { recursive: true, force: true });
  }

  async function importJson(json: string): Promise<CatalogModel[]> {
    const imported = readImport(json);
    const local = await readLocalCatalog();
    const byId = new Map<string, CatalogModel>();

    for (const model of [...local, ...imported]) byId.set(model.id, model);

    await mkdir(path.dirname(localCatalogPath), { recursive: true });
    await writeFile(
      localCatalogPath,
      `${JSON.stringify(
        { schemaVersion: 1, models: [...byId.values()] },
        null,
        2,
      )}\n`,
      'utf8',
    );

    return imported;
  }

  async function reveal(id: string): Promise<void> {
    if (!ID_PATTERN.test(id)) throw new Error('Invalid model id.');
    await shell.openPath(modelDir(id));
  }

  return { list, install, cancel, remove, importJson, reveal };
}
