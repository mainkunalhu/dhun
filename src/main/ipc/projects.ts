import { app, ipcMain } from 'electron';
import path from 'node:path';
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
}
