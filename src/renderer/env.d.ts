import type { ProjectsApi } from '../shared/project';

declare global {
  interface Window {
    dhun: {
      projects: ProjectsApi;
    };
  }
}
