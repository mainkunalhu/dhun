export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'canceled';

export type Job = {
  id: string;
  projectId: string;
  modelId: string;
  voiceId: string;
  language: string;
  speed: number;
  script: string;
  status: JobStatus;
  progress: number;
  outputPath: string | null;
  durationMs: number | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewJob = {
  modelId: string;
  voiceId: string;
  language: string;
  speed: number;
  script: string;
};

export type JobsApi = {
  list(projectId: string): Promise<Job[]>;
  create(projectId: string, input: NewJob): Promise<Job>;
  cancel(projectId: string, jobId: string): Promise<Job>;
  retry(projectId: string, jobId: string): Promise<Job>;
};
