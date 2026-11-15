import { readFileSync } from 'node:fs';
import { app, ipcMain, shell } from 'electron';
import path from 'node:path';
import type { NewJob } from '../../shared/job';
import type { ProjectSettings } from '../../shared/project';
import { Sidecar } from '../engine/sidecar';
import { createRenderQueue } from '../jobs/queue';
import { createModelManager } from '../models/store';
import { createProjectStore } from '../projects/store';

function readPython(userData: string): string {
  try {
    const raw = JSON.parse(
      readFileSync(path.join(userData, 'engine.json'), 'utf8'),
    ) as { python?: unknown };
    if (typeof raw.python === 'string' && raw.python) return raw.python;
  } catch {
    // Fall through to the environment.
  }

  return process.env.DHUN_PYTHON ?? 'python3';
}

export function registerProjectHandlers(): void {
  const userData = app.getPath('userData');
  const store = createProjectStore(path.join(userData, 'projects'));
  const models = createModelManager({
    modelsRoot: path.join(userData, 'models'),
    localCatalogPath: path.join(userData, 'models.local.json'),
    onProgress: () => {},
  });
  const sidecar = new Sidecar(
    readPython(userData),
    app.isPackaged
      ? path.join(process.resourcesPath, 'engine', 'dhun_engine.py')
      : path.join(__dirname, '../../engine/dhun_engine.py'),
  );
  const queue = createRenderQueue({
    store,
    models,
    sidecar,
    rendersRoot: path.join(userData, 'renders'),
  });

  app.on('before-quit', () => sidecar.shutdown());

  ipcMain.handle('projects:list', () => store.list());
  ipcMain.handle('projects:get', (_event, id: string) => store.get(id));
  ipcMain.handle('projects:create', (_event, name: string) =>
    store.create(name),
  );
  ipcMain.handle('projects:rename', (_event, id: string, name: string) =>
    store.rename(id, name),
  );
  ipcMain.handle(
    'projects:setFavorite',
    (_event, id: string, favorite: boolean) => store.setFavorite(id, favorite),
  );
  ipcMain.handle('projects:delete', (_event, id: string) => store.remove(id));
  ipcMain.handle('projects:saveScript', (_event, id: string, script: string) =>
    store.saveScript(id, script),
  );
  ipcMain.handle(
    'projects:saveSettings',
    (_event, id: string, settings: ProjectSettings) =>
      store.saveSettings(id, settings),
  );

  ipcMain.handle('jobs:list', (_event, projectId: string) =>
    store.listJobs(projectId),
  );
  ipcMain.handle(
    'jobs:create',
    async (_event, projectId: string, input: NewJob) => {
      const job = await store.createJob(projectId, input);
      queue.enqueue(projectId, job.id);
      return job;
    },
  );
  ipcMain.handle(
    'jobs:cancel',
    async (_event, projectId: string, jobId: string) => {
      const job = await store.cancelJob(projectId, jobId);
      queue.cancel(jobId);
      return job;
    },
  );
  ipcMain.handle(
    'jobs:play',
    async (_event, projectId: string, jobId: string) => {
      const job = await store.getJob(projectId, jobId);
      if (!job.outputPath) throw new Error('This take has no audio yet.');
      await shell.openPath(job.outputPath);
    },
  );

  void queue.recover();
}
