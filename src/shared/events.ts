export type DhunEventsApi = {
  onProjectsChanged(callback: () => void): () => void;
  onJobsChanged(callback: (projectId: string) => void): () => void;
};
