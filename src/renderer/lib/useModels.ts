import { useCallback, useEffect, useState } from 'react';
import type { ModelProgress, ModelSummary } from '../../shared/model';

export function useModels() {
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setModels(await window.dhun.models.list());
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not read models.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return window.dhun.models.onProgress((progress: ModelProgress) => {
      setModels((current) =>
        current.map((model) => {
          if (model.id !== progress.id) return model;

          if (progress.status === 'downloading') {
            return {
              ...model,
              installing: true,
              downloadedBytes: progress.downloadedBytes,
              totalBytes: progress.totalBytes,
              error: null,
            };
          }

          if (progress.status === 'installed') {
            return {
              ...model,
              installed: true,
              installing: false,
              downloadedBytes: progress.totalBytes,
              totalBytes: progress.totalBytes,
              error: null,
            };
          }

          if (progress.status === 'canceled') {
            return {
              ...model,
              installing: false,
              downloadedBytes: 0,
              error: null,
            };
          }

          return {
            ...model,
            installing: false,
            downloadedBytes: 0,
            error: progress.error ?? 'Download failed.',
          };
        }),
      );
    });
  }, []);

  return { models, loading, error, refresh };
}
