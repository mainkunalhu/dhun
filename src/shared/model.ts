export type ModelVoice = {
  id: string;
  name: string;
  language: string;
  gender?: 'female' | 'male';
};

export type CatalogModel = {
  id: string;
  name: string;
  family: string;
  /** Must match a Python engine adapter. */
  engine: string;
  engineStatus: 'ready' | 'planned';
  repo: string;
  revision: string;
  params: string;
  languages: string[];
  voiceMode: 'preset' | 'clone' | 'both';
  voices: ModelVoice[];
  license: string;
  approxSizeBytes: number;
  minRamGb: number;
  notes: string;
};

export type ModelSummary = CatalogModel & {
  installed: boolean;
  installing: boolean;
  downloadedBytes: number;
  totalBytes: number;
  error: string | null;
};

export type ModelProgress = {
  id: string;
  status: 'downloading' | 'installed' | 'error' | 'canceled';
  downloadedBytes: number;
  totalBytes: number;
  error?: string;
};

export type ModelsApi = {
  list(): Promise<ModelSummary[]>;
  install(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
  remove(id: string): Promise<void>;
  importJson(json: string): Promise<CatalogModel[]>;
  reveal(id: string): Promise<void>;
  onProgress(callback: (progress: ModelProgress) => void): () => void;
};
