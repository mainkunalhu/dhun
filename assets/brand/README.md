# Brand assets

`logo.png` is the master artwork (1024 × 1024). Everything else in this folder
is generated from it — do not hand-edit the generated files.

| File            | Platform        | Notes                                          |
| --------------- | --------------- | ---------------------------------------------- |
| `icon.png`      | Linux, generic  | 1024, full bleed                               |
| `icon-512.png`  | deb / rpm       | 512, full bleed                                |
| `icon.ico`      | Windows         | 16–256, multi-size                             |
| `icon.icns`     | macOS           | 16–1024, rounded square, inset, soft shadow    |
| `icon-rounded.png` | in-app       | 512, rounded square on transparency            |

Regenerate after replacing `logo.png`:

```bash
bun run icons
```

The script is `scripts/build-icons.py`. It needs `uv`; Pillow is fetched on the
first run. Windows and Linux keep the full-bleed square; macOS gets the platform
treatment (824px rounded square inset by 100px on a transparent canvas).

Wiring lives in:

- `forge.config.mts` — `packagerConfig.icon`, `extraResource`, and the Squirrel,
  deb and rpm maker icons
- `src/main.ts` — dev Dock icon and the Linux window icon
