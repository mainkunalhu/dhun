<p align="center">
  <img src="assets/brand/icon-rounded.png" alt="Dhun" width="112" height="112" />
</p>

<h1 align="center">Dhun</h1>

<p align="center">
  A local-first voiceover studio. One script, every voice, nothing leaves your machine.
</p>

---

Dhun turns a script into a finished voiceover in English or Hinglish, in any
voice you've cloned, without sending a word to the cloud.

## Status

- [x] Electron + React shell with a typed IPC boundary
- [x] Theme and component baseline
- [x] Splash / first-run screen
- [x] Local project folders: create, rename, favorite, delete
- [x] Model library: Hugging Face downloads, local cache reuse, JSON import
- [x] Studio: script editor, model/voice/language picker, sequential render queue
- [x] MLX engine sidecar: Qwen3-TTS VoiceDesign, Maya 2 Native, Kokoro
- [ ] Voice cloning (Chatterbox)
- [ ] WAV / MP3 export

## Stack

Electron, React, TypeScript, Vite, Tailwind CSS v4. The voice engine is a Python
sidecar using `mlx-audio` on Apple Silicon.

## Development

```bash
bun install
bun run start
```

Other scripts: `bun run typecheck`, `bun run lint`, `bun run icons`,
`bun run seed`, `bun run package`.

### Voice engine

The sidecar needs a Python 3.12 environment with `mlx-audio`, `numpy` and
`soundfile`. Point the app at it with a small config file:

```bash
uv venv "$HOME/Library/Application Support/Dhun/runtime"
uv pip install --python "$HOME/Library/Application Support/Dhun/runtime/bin/python" mlx-audio

cat > "$HOME/Library/Application Support/Dhun/engine.json" <<EOF
{ "python": "$HOME/Library/Application Support/Dhun/runtime/bin/python" }
EOF
```

The runtime is not bundled with the app yet; `engine/dhun_engine.py` is.

## Where data lives

Projects are plain folders, not a database:

```
~/Library/Application Support/Dhun/
├── engine.json                 python path for the sidecar
├── models/<model-id>/          downloaded or linked model files
├── renders/<job-id>.wav        rendered takes
└── projects/
    └── week-32-reel/
        ├── project.json        script, voice settings
        └── jobs/<job-id>.json  queue state
```

## License

MIT
