import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { createModelManager } from '../models/store';

export function registerModelHandlers(): void {
  const manager = createModelManager({
    modelsRoot: path.join(app.getPath('userData'), 'models'),
    localCatalogPath: path.join(app.getPath('userData'), 'models.local.json'),
    onProgress: (progress) => {
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send('models:progress', progress);
      }
    },
  });

  ipcMain.handle('models:list', () => manager.list());
  ipcMain.handle('models:install', (_event, id: string) => manager.install(id));
  ipcMain.handle('models:cancel', (_event, id: string) => manager.cancel(id));
  ipcMain.handle('models:remove', (_event, id: string) => manager.remove(id));
  ipcMain.handle('models:import', (_event, json: string) =>
    manager.importJson(json),
  );
  ipcMain.handle('models:reveal', (_event, id: string) => manager.reveal(id));
}
