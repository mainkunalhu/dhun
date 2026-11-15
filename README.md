<p align="center">
  <img src="assets/brand/icon-rounded.png" alt="" width="112" height="112" />
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/brand/wordmark-dark.svg">
    <img src="assets/brand/wordmark-light.svg" alt="Dhun" height="48">
  </picture>
</p>

<p align="center">
  A local-first voiceover studio. One script, every voice, nothing leaves your machine.
</p>

Dhun turns a script into a voiceover with local models. Projects, takes and audio
stay on disk.

## Models

Every model is already listed in the app. Open **Models**, press **Install**, and
Dhun downloads it from Hugging Face. If the files are already in your local cache,
Dhun reuses them — no manual model setup.

| Model                              | Size    | Languages      | Voices             |
| ---------------------------------- | ------- | -------------- | ------------------ |
| Kokoro 82M                         | ~340 MB | English, Hindi | 9 presets          |
| Kokoro 82M (4-bit)                 | ~280 MB | English, Hindi | 9 presets          |
| Qwen3-TTS 1.7B VoiceDesign         | ~4.2 GB | English        | 10 designed voices |
| Qwen3-TTS 1.7B VoiceDesign (6-bit) | ~2.5 GB | English        | 10 designed voices |
| Maya 2 Native                      | ~4.7 GB | Hindi          | 20 Indian voices   |
| Chatterbox Multilingual v3         | ~2.6 GB | 23 languages   | voice cloning      |
| Chatterbox (English)               | ~2.5 GB | English        | voice cloning      |

Chatterbox is listed for voice cloning; the cloning UI is not available yet.

## Install

Download the latest build from [Releases](../../releases/latest). Builds are
unsigned, so your OS may ask for confirmation the first time.

| Platform              | Download                  | Install                                            |
| --------------------- | ------------------------- | -------------------------------------------------- |
| macOS (Apple Silicon) | `Dhun-*-arm64.dmg`        | Open the DMG, drag **Dhun** into **Applications**. |
| macOS (portable)      | `Dhun-darwin-arm64-*.zip` | Unzip and move **Dhun.app** into **Applications**. |
| Linux (Debian/Ubuntu) | `dhun_*_amd64.deb`        | `sudo dpkg -i dhun_*_amd64.deb`                    |
| Linux (portable)      | `Dhun-linux-x64-*.zip`    | Unzip, then run `./Dhun` from the folder.          |
| Windows 10/11 (x64)   | `Dhun-win32-x64-*.zip`    | Unzip, keep the folder together, run `Dhun.exe`.   |

### macOS

1. Open the DMG and drag **Dhun** into **Applications**.
2. If macOS blocks the unsigned app, right-click **Dhun** → **Open**, or go to
   **System Settings → Privacy & Security → Open Anyway**.
3. Voice generation requires Apple Silicon.

### Linux

Debian/Ubuntu:

```bash
sudo dpkg -i dhun_*_amd64.deb
sudo apt -f install   # only if dependencies are missing
```

Then launch **Dhun** from your app menu.

Portable:

```bash
unzip Dhun-linux-x64-*.zip
cd Dhun-linux-x64
chmod +x Dhun
./Dhun
```

If the sandbox helper complains, install the `.deb` instead.

### Windows

1. Right-click the zip → **Extract All**.
2. Open the extracted folder and run **`Dhun.exe`**.
3. Keep the whole folder together — the executable needs the DLLs and
   `resources` beside it.
4. If SmartScreen appears, click **More info → Run anyway**.
5. Optional: right-click `Dhun.exe` → **Send to → Desktop (create shortcut)**.

Voice generation currently uses MLX and runs on Apple Silicon macOS. Windows and
Linux builds open the studio and manage projects, but rendering is not available
there yet.

## Development

```bash
bun install
bun run start
```

Other scripts: `bun run typecheck`, `bun run lint`, `bun run package`,
`bun run make`.

The Python engine lives in `engine/` and needs a local Python 3.12 runtime with
`mlx-audio`.

## Data

Projects are plain folders in the app's user data directory:

```
projects/<project>/
├── project.json
└── jobs/<job>.json
```

Rendered audio is stored as WAV in `renders/`.

## License

MIT
