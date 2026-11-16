import { contextBridge, ipcRenderer } from 'electron';
import type { DhunEventsApi } from './shared/events';
import type { JobsApi } from './shared/job';
import type { ModelProgress, ModelsApi } from './shared/model';
import type { ProjectsApi } from './shared/project';

const projects: ProjectsApi = {
  list: () => ipcRenderer.invoke('projects:list'),
  get: (id) => ipcRenderer.invoke('projects:get', id),
  create: (name) => ipcRenderer.invoke('projects:create', name),
  rename: (id, name) => ipcRenderer.invoke('projects:rename', id, name),
  setFavorite: (id, favorite) =>
    ipcRenderer.invoke('projects:setFavorite', id, favorite),
  remove: (id) => ipcRenderer.invoke('projects:delete', id),
  saveScript: (id, script) =>
    ipcRenderer.invoke('projects:saveScript', id, script),
  saveSettings: (id, settings) =>
    ipcRenderer.invoke('projects:saveSettings', id, settings),
};

const jobs: JobsApi = {
  list: (projectId) => ipcRenderer.invoke('jobs:list', projectId),
  create: (projectId, input) =>
    ipcRenderer.invoke('jobs:create', projectId, input),
  cancel: (projectId, jobId) =>
    ipcRenderer.invoke('jobs:cancel', projectId, jobId),
  retry: (projectId, jobId) =>
    ipcRenderer.invoke('jobs:retry', projectId, jobId),
  remove: (projectId, jobId) =>
    ipcRenderer.invoke('jobs:remove', projectId, jobId),
  move: (fromProjectId, toProjectId, jobId) =>
    ipcRenderer.invoke('jobs:move', fromProjectId, toProjectId, jobId),
  rename: (projectId, jobId, name) =>
    ipcRenderer.invoke('jobs:rename', projectId, jobId, name),
  export: (projectId, jobId) =>
    ipcRenderer.invoke('jobs:export', projectId, jobId),
};

const models: ModelsApi = {
  list: () => ipcRenderer.invoke('models:list'),
  install: (id) => ipcRenderer.invoke('models:install', id),
  cancel: (id) => ipcRenderer.invoke('models:cancel', id),
  remove: (id) => ipcRenderer.invoke('models:remove', id),
  importJson: (json) => ipcRenderer.invoke('models:import', json),
  reveal: (id) => ipcRenderer.invoke('models:reveal', id),
  onProgress: (callback) => {
    const handler = (_event: unknown, progress: ModelProgress) =>
      callback(progress);
    ipcRenderer.on('models:progress', handler);
    return () => ipcRenderer.off('models:progress', handler);
  },
};

const events: DhunEventsApi = {
  onProjectsChanged: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('dhun:projects-changed', handler);
    return () => ipcRenderer.off('dhun:projects-changed', handler);
  },
  onJobsChanged: (callback) => {
    const handler = (_event: unknown, projectId: string) => callback(projectId);
    ipcRenderer.on('dhun:jobs-changed', handler);
    return () => ipcRenderer.off('dhun:jobs-changed', handler);
  },
};

contextBridge.exposeInMainWorld('dhun', { projects, models, jobs, events });
