export type ProjectSettings = {
  modelId: string | null;
  voiceId: string | null;
  language: string;
  speed: number;
};

export type Project = {
  id: string;
  name: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  script: string;
  settings: ProjectSettings;
};

export type ProjectSummary = Project & {
  /** Filled in once voices and takes exist; zero for a new project. */
  voices: number;
  takes: number;
};

/** The surface the preload exposes to the renderer. */
export type ProjectsApi = {
  list(): Promise<ProjectSummary[]>;
  get(id: string): Promise<ProjectSummary>;
  create(name: string): Promise<Project>;
  rename(id: string, name: string): Promise<Project>;
  setFavorite(id: string, favorite: boolean): Promise<Project>;
  remove(id: string): Promise<void>;
  saveScript(id: string, script: string): Promise<Project>;
  saveSettings(id: string, settings: ProjectSettings): Promise<Project>;
};
