import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Job } from '../../shared/job';
import type { Sidecar } from '../engine/sidecar';
import type { createModelManager } from '../models/store';
import type { createProjectStore } from '../projects/store';

type ProjectStore = ReturnType<typeof createProjectStore>;
type ModelManager = ReturnType<typeof createModelManager>;

/**
 * One render at a time. Jobs are persisted by the project store, so a restart
 * can pick up anything still queued.
 */
export function createRenderQueue({
  store,
  models,
  sidecar,
  rendersRoot,
}: {
  store: ProjectStore;
  models: ModelManager;
  sidecar: Sidecar;
  rendersRoot: string;
}) {
  const queue: Array<{ projectId: string; jobId: string }> = [];
  let running = false;
  let activeJobId: string | null = null;

  async function pump(): Promise<void> {
    if (running) return;
    running = true;

    try {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) break;
        activeJobId = next.jobId;
        await render(next.projectId, next.jobId);
        activeJobId = null;
      }
    } finally {
      running = false;
      activeJobId = null;
    }
  }

  function enqueue(projectId: string, jobId: string): void {
    queue.push({ projectId, jobId });
    void pump();
  }

  async function render(projectId: string, jobId: string): Promise<void> {
    let job: Job;

    try {
      job = await store.getJob(projectId, jobId);
    } catch {
      return;
    }

    if (job.status !== 'queued') return;

    const model = await models.get(job.modelId);
    if (!model) {
      await store.updateJob(projectId, jobId, {
        status: 'failed',
        error: 'Model not found.',
      });
      return;
    }

    const voice = model.voices.find((item) => item.id === job.voiceId);
    const outputPath = path.join(rendersRoot, `${job.id}.wav`);

    await mkdir(rendersRoot, { recursive: true });
    await store.updateJob(projectId, jobId, {
      status: 'running',
      progress: 1,
      error: null,
    });

    try {
      const result = await sidecar.render(
        {
          engine: model.engine,
          modelPath: models.modelPath(job.modelId),
          script: job.script,
          voiceId: job.voiceId,
          voiceName: voice?.name ?? job.voiceId,
          voicePrompt: voice?.prompt ?? '',
          language: job.language,
          speed: job.speed,
          outputPath,
        },
        (progress) => {
          void store.updateJob(projectId, jobId, { progress });
        },
      );

      await store.updateJob(projectId, jobId, {
        status: 'done',
        progress: 100,
        outputPath: result.wavPath,
        durationMs: result.durationMs,
      });
    } catch (error) {
      const canceled = (error as { code?: string }).code === 'CANCELED';

      await store.updateJob(projectId, jobId, {
        status: canceled ? 'canceled' : 'failed',
        progress: 0,
        error: canceled
          ? null
          : error instanceof Error
            ? error.message
            : 'Render failed.',
      });
    }
  }

  function cancel(jobId: string): void {
    if (activeJobId === jobId) sidecar.cancel();
  }

  async function recover(): Promise<void> {
    try {
      const projects = await store.list(true);
      for (const project of projects) {
        const jobs = await store.listJobs(project.id);
        for (const job of jobs) {
          if (job.status === 'queued') {
            queue.push({ projectId: project.id, jobId: job.id });
          }
        }
      }
      await pump();
    } catch {
      // A broken project must not stop the app from starting.
    }
  }

  return { enqueue, cancel, recover };
}
