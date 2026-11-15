import { createWriteStream } from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { CatalogModel } from '../../shared/model';

type TreeEntry = {
  type: 'file' | 'directory';
  path: string;
  size?: number;
  lfs?: { oid: string; size: number };
};

const HF_API = 'https://huggingface.co/api/models';
const HF_RESOLVE = 'https://huggingface.co';

/** Docs, images and the original PyTorch weights are not needed to run MLX. */
function isNeeded(filePath: string): boolean {
  const name = filePath.split('/').pop() ?? '';

  if (filePath === '.gitattributes') return false;
  if (/^(README|LICENSE)/i.test(name)) return false;
  if (
    /\.(md|png|jpe?g|webp|gif|svg|wav|mp3|mp4|mov|webm|mkv|h5|onnx)$/i.test(
      filePath,
    )
  ) {
    return false;
  }
  if (filePath.startsWith('original/') || filePath.startsWith('samples/')) {
    return false;
  }

  return true;
}

function resolveUrl(model: CatalogModel, filePath: string): string {
  const encoded = filePath.split('/').map(encodeURIComponent).join('/');
  return `${HF_RESOLVE}/${model.repo}/resolve/${model.revision}/${encoded}`;
}

export async function downloadModel(
  model: CatalogModel,
  targetDir: string,
  onProgress: (downloaded: number, total: number) => void,
  signal: AbortSignal,
): Promise<void> {
  const treeResponse = await fetch(
    `${HF_API}/${model.repo}/tree/${model.revision}?recursive=true`,
    { signal },
  );

  if (!treeResponse.ok) {
    throw new Error(
      `Could not read the file list for ${model.repo} (${treeResponse.status}).`,
    );
  }

  const tree = (await treeResponse.json()) as TreeEntry[];
  const files = tree.filter(
    (entry) => entry.type === 'file' && isNeeded(entry.path),
  );

  if (files.length === 0) {
    throw new Error(`No downloadable files found in ${model.repo}.`);
  }

  const total = files.reduce(
    (sum, file) => sum + (file.lfs?.size ?? file.size ?? 0),
    0,
  );

  onProgress(0, total);
  await mkdir(targetDir, { recursive: true });

  let downloaded = 0;

  for (const file of files) {
    if (signal.aborted) throw new Error('Canceled');

    const destination = path.join(targetDir, file.path);
    await mkdir(path.dirname(destination), { recursive: true });

    const response = await fetch(resolveUrl(model, file.path), { signal });
    if (!response.ok || !response.body) {
      throw new Error(`Download failed for ${file.path} (${response.status}).`);
    }

    const temp = `${destination}.part`;
    let lastReport = 0;

    await pipeline(
      Readable.fromWeb(response.body as never),
      new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          downloaded += chunk.length;
          const now = Date.now();
          if (now - lastReport > 120) {
            lastReport = now;
            onProgress(downloaded, total);
          }
          callback(null, chunk);
        },
      }),
      createWriteStream(temp),
    );

    await rename(temp, destination);
  }

  onProgress(total, total);

  await writeFile(
    path.join(targetDir, 'manifest.json'),
    `${JSON.stringify(
      {
        id: model.id,
        repo: model.repo,
        revision: model.revision,
        installedAt: new Date().toISOString(),
        files: files.map((file) => ({
          path: file.path,
          size: file.lfs?.size ?? file.size ?? 0,
        })),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}
