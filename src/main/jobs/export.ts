import { existsSync } from 'node:fs';
import { copyFile } from 'node:fs/promises';
import { app, shell } from 'electron';
import path from 'node:path';
import type { createProjectStore } from '../projects/store';

/**
 * Copy a finished take into the OS Downloads folder. The UI reveals it in the
 * file manager; MCP exports stay quiet.
 */
export async function exportTake(
  store: ReturnType<typeof createProjectStore>,
  projectId: string,
  jobId: string,
  { reveal = false }: { reveal?: boolean } = {},
): Promise<string> {
  const job = await store.getJob(projectId, jobId);
  if (!job.outputPath) throw new Error('This take has no audio yet.');

  const base =
    job.name
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) || 'take';
  const downloads = app.getPath('downloads');
  let target = path.join(downloads, `${base}.wav`);
  let suffix = 2;

  while (existsSync(target)) {
    target = path.join(downloads, `${base}-${suffix}.wav`);
    suffix += 1;
  }

  await copyFile(job.outputPath, target);
  if (reveal) shell.showItemInFolder(target);
  return target;
}
