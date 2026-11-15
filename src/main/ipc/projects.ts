import { app, ipcMain } from 'electron';
import path from 'node:path';
import type { NewJob } from '../../shared/job';
import type { ProjectSettings } from '../../shared/project';
import { createProjectStore } from '../projects/store';

export function registerProjectHandlers(): void {
  const store = createProjectStore(
    path.join(app.getPath('userData'), 'projects'),
  );

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
  ipcMain.handle('jobs:create', (_event, projectId: string, input: NewJob) =>
    store.createJob(projectId, input),
  );
  ipcMain.handle('jobs:cancel', (_event, projectId: string, jobId: string) =>
    store.cancelJob(projectId, jobId),
  );
}
