import { app, BrowserWindow } from 'electron';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Sidecar } from './engine/sidecar';
import { createRenderQueue } from './jobs/queue';
import { createModelManager } from './models/store';
import { createProjectStore } from './projects/store';

function readPython(userData: string): string {
  try {
    const raw = JSON.parse(
      readFileSync(path.join(userData, 'engine.json'), 'utf8'),
    ) as { python?: unknown };
    if (typeof raw.python === 'string' && raw.python) return raw.python;
  } catch {
    // Fall through to the environment.
  }

  return process.env.DHUN_PYTHON ?? 'python3';
}

/**
 * One set of services shared by IPC and the local MCP server. Creating these
 * twice would mean two render queues writing the same job files.
 */
export function createDhunServices() {
  const userData = app.getPath('userData');
  const store = createProjectStore(path.join(userData, 'projects'));
  const models = createModelManager({
    modelsRoot: path.join(userData, 'models'),
    localCatalogPath: path.join(userData, 'models.local.json'),
    onProgress: (progress) => {
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send('models:progress', progress);
      }
    },
  });
  const sidecar = new Sidecar(
    readPython(userData),
    app.isPackaged
      ? path.join(process.resourcesPath, 'engine', 'dhun_engine.py')
      : path.join(__dirname, '../../engine/dhun_engine.py'),
  );
  const rendersRoot = path.join(userData, 'renders');
  const queue = createRenderQueue({
    store,
    models,
    sidecar,
    rendersRoot,
  });

  return { userData, store, models, sidecar, queue, rendersRoot };
}

export type DhunServices = ReturnType<typeof createDhunServices>;
