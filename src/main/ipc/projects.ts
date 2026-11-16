import { ipcMain } from 'electron';
import type { NewJob } from '../../shared/job';
import type { ProjectSettings } from '../../shared/project';
import { notifyJobsChanged, notifyProjectsChanged } from '../events';
import { exportTake } from '../jobs/export';
import type { DhunServices } from '../services';

export function registerProjectHandlers(services: DhunServices): void {
  const { store, queue } = services;

  ipcMain.handle('projects:list', () => store.list());
  ipcMain.handle('projects:get', (_event, id: string) => store.get(id));
  ipcMain.handle('projects:create', async (_event, name: string) => {
    const project = await store.create(name);
    notifyProjectsChanged();
    return project;
  });
  ipcMain.handle(
    'projects:rename',
    async (_event, id: string, name: string) => {
      const project = await store.rename(id, name);
      notifyProjectsChanged();
      return project;
    },
  );
  ipcMain.handle(
    'projects:setFavorite',
    async (_event, id: string, favorite: boolean) => {
      const project = await store.setFavorite(id, favorite);
      notifyProjectsChanged();
      return project;
    },
  );
  ipcMain.handle('projects:delete', async (_event, id: string) => {
    await store.remove(id);
    notifyProjectsChanged();
  });
  ipcMain.handle(
    'projects:saveScript',
    async (_event, id: string, script: string) => {
      const project = await store.saveScript(id, script);
      notifyProjectsChanged();
      return project;
    },
  );
  ipcMain.handle(
    'projects:saveSettings',
    async (_event, id: string, settings: ProjectSettings) => {
      const project = await store.saveSettings(id, settings);
      notifyProjectsChanged();
      return project;
    },
  );

  ipcMain.handle('jobs:list', (_event, projectId: string) =>
    store.listJobs(projectId),
  );
  ipcMain.handle(
    'jobs:create',
    async (_event, projectId: string, input: NewJob) => {
      const job = await store.createJob(projectId, input);
      queue.enqueue(projectId, job.id);
      notifyJobsChanged(projectId);
      return job;
    },
  );
  ipcMain.handle(
    'jobs:cancel',
    async (_event, projectId: string, jobId: string) => {
      const job = await store.cancelJob(projectId, jobId);
      queue.cancel(jobId);
      notifyJobsChanged(projectId);
      return job;
    },
  );
  ipcMain.handle(
    'jobs:remove',
    async (_event, projectId: string, jobId: string) => {
      await store.removeJob(projectId, jobId);
      notifyJobsChanged(projectId);
    },
  );
  ipcMain.handle(
    'jobs:move',
    async (
      _event,
      fromProjectId: string,
      toProjectId: string,
      jobId: string,
    ) => {
      const job = await store.moveJob(fromProjectId, toProjectId, jobId);
      notifyJobsChanged(fromProjectId);
      notifyJobsChanged(toProjectId);
      return job;
    },
  );
  ipcMain.handle(
    'jobs:rename',
    async (_event, projectId: string, jobId: string, name: string) => {
      const job = await store.renameJob(projectId, jobId, name);
      notifyJobsChanged(projectId);
      return job;
    },
  );
  ipcMain.handle('jobs:export', (_event, projectId: string, jobId: string) =>
    exportTake(store, projectId, jobId, { reveal: true }),
  );
  ipcMain.handle(
    'jobs:retry',
    async (_event, projectId: string, jobId: string) => {
      const job = await store.getJob(projectId, jobId);
      if (job.status !== 'failed' && job.status !== 'canceled') return job;

      const next = await store.updateJob(projectId, jobId, {
        status: 'queued',
        progress: 0,
        error: null,
        outputPath: null,
        durationMs: null,
      });
      queue.enqueue(projectId, jobId);
      notifyJobsChanged(projectId);
      return next;
    },
  );
}
