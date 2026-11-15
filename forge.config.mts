import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const brandIcon = (name: string) =>
  path.join(projectRoot, 'assets', 'brand', name);

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    // No extension: @electron/packager resolves .icns (macOS), .ico (Windows)
    // and .png (Linux) from the same name.
    icon: brandIcon('icon'),
    // The Vite plugin only ships .vite inside the asar, so the window icon is
    // copied separately for Linux (and for app.dock in a packaged dev build).
    extraResource: [brandIcon('icon.png')],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({ setupIcon: brandIcon('icon.ico') }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({ options: { icon: brandIcon('icon-512.png') } }),
    new MakerDeb({ options: { icon: brandIcon('icon-512.png') } }),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main/index.ts',
          config: 'vite.main.config.mts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.mts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
