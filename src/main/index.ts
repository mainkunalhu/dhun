import { app, BrowserWindow, protocol } from 'electron';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { registerModelHandlers } from './ipc/models';
import { registerProjectHandlers } from './ipc/projects';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

app.setName('Dhun');

// Lets the renderer play rendered takes without opening another app.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'dhun-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
    },
  },
]);

/**
 * In dev the artwork lives in the repo; in a packaged build it is copied to
 * Contents/Resources/icon.png via packagerConfig.extraResource.
 * Packaged Windows and macOS builds also take the icon from the bundle; this
 * path covers the Linux window icon and the dev Dock.
 */
const iconPath = app.isPackaged
  ? path.join(process.resourcesPath, 'icon.png')
  : path.join(__dirname, '../../assets/brand/icon.png');

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1080,
    minHeight: 720,
    show: false,
    icon: iconPath,
    // Matches --dh-canvas (dark). Avoids a white flash before the first paint.
    backgroundColor: '#10100e',
    autoHideMenuBar: true,
    ...(process.platform === 'darwin'
      ? {
          titleBarStyle: 'hiddenInset' as const,
          trafficLightPosition: { x: 16, y: 15 },
        }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  registerProjectHandlers();
  registerModelHandlers();

  const rendersRoot = path.join(app.getPath('userData'), 'renders');
  protocol.handle('dhun-media', async (request) => {
    const url = new URL(request.url);
    const name = path.basename(decodeURIComponent(url.pathname));

    if (!/^[0-9a-f-]{36}\.wav$/i.test(name)) {
      return new Response('Not found', { status: 404 });
    }

    try {
      const filePath = path.join(rendersRoot, name);
      const total = (await stat(filePath)).size;
      const headers = {
        'Content-Type': 'audio/wav',
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
      };
      const body = (start?: number, end?: number) =>
        Readable.toWeb(
          createReadStream(
            filePath,
            start === undefined ? undefined : { start, end },
          ),
        ) as unknown as ReadableStream;

      // Media elements ask for byte ranges, especially while another render is
      // keeping the machine busy. Answering with the full file makes the
      // decoder restart from the beginning, so honour the range properly.
      const range = request.headers.get('range');
      const match = range?.match(/^bytes=(\d*)-(\d*)$/);

      if (match) {
        let start = match[1] ? Number(match[1]) : 0;
        let end = match[2] ? Number(match[2]) : total - 1;

        if (!match[1] && match[2]) {
          start = Math.max(0, total - Number(match[2]));
          end = total - 1;
        }

        if (
          !Number.isFinite(start) ||
          !Number.isFinite(end) ||
          start > end ||
          start >= total
        ) {
          return new Response(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${total}` },
          });
        }

        end = Math.min(end, total - 1);

        return new Response(body(start, end), {
          status: 206,
          headers: {
            ...headers,
            'Content-Length': String(end - start + 1),
            'Content-Range': `bytes ${start}-${end}/${total}`,
          },
        });
      }

      return new Response(body(), {
        status: 200,
        headers: { ...headers, 'Content-Length': String(total) },
      });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });

  // In dev the Dock would otherwise show the generic Electron icon.
  if (process.platform === 'darwin' && !app.isPackaged) {
    app.dock?.setIcon(iconPath);
  }

  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
