import { app, BrowserWindow, protocol } from 'electron';
import { readFile } from 'node:fs/promises';
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
      const data = await readFile(path.join(rendersRoot, name));
      return new Response(data, {
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Length': String(data.length),
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
        },
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
