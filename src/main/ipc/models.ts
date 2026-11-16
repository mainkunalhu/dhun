import { ipcMain } from 'electron';
import type { DhunServices } from '../services';

export function registerModelHandlers(services: DhunServices): void {
  const manager = services.models;

  ipcMain.handle('models:list', () => manager.list());
  ipcMain.handle('models:install', (_event, id: string) => manager.install(id));
  ipcMain.handle('models:cancel', (_event, id: string) => manager.cancel(id));
  ipcMain.handle('models:remove', (_event, id: string) => manager.remove(id));
  ipcMain.handle('models:import', (_event, json: string) =>
    manager.importJson(json),
  );
  ipcMain.handle('models:reveal', (_event, id: string) => manager.reveal(id));
}
