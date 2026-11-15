import { useCallback, useEffect, useState } from 'react';
import type { Job } from '../../shared/job';

export function useJobs(projectId: string | undefined) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      setJobs(await window.dhun.jobs.list(projectId));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read jobs.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const active = jobs.some(
      (job) => job.status === 'queued' || job.status === 'running',
    );
    if (!active) return;

    const timer = window.setInterval(() => void refresh(), 900);
    return () => window.clearInterval(timer);
  }, [jobs, refresh]);

  return { jobs, loading, error, refresh };
}
