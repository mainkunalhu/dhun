import { useCallback, useEffect, useState } from 'react';
import type { ProjectSummary } from '../../shared/project';

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Could not read projects.';
}

/**
 * Reads the project folders through the preload bridge. Writes are performed
 * by the screen and followed by a refresh, so the list always reflects disk.
 */
export function useProjects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await window.dhun.projects.list();
      setProjects(next);
      setError(null);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return window.dhun.events.onProjectsChanged(() => {
      void refresh();
    });
  }, [refresh]);

  return { projects, loading, error, refresh };
}
