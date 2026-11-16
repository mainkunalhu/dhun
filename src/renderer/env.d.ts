import type { DhunEventsApi } from '../shared/events';
import type { JobsApi } from '../shared/job';
import type { ModelsApi } from '../shared/model';
import type { ProjectsApi } from '../shared/project';

declare global {
  interface Window {
    dhun: {
      projects: ProjectsApi;
      models: ModelsApi;
      jobs: JobsApi;
      events: DhunEventsApi;
    };
  }
}
