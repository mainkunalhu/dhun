import { contextBridge, ipcRenderer } from 'electron';
import type { ProjectsApi } from './shared/project';

const projects: ProjectsApi = {
  list: () => ipcRenderer.invoke('projects:list'),
  get: (id) => ipcRenderer.invoke('projects:get', id),
  create: (name) => ipcRenderer.invoke('projects:create', name),
  rename: (id, name) => ipcRenderer.invoke('projects:rename', id, name),
  setFavorite: (id, favorite) =>
    ipcRenderer.invoke('projects:setFavorite', id, favorite),
  remove: (id) => ipcRenderer.invoke('projects:delete', id),
};

contextBridge.exposeInMainWorld('dhun', { projects });
