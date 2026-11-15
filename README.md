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

Download the latest macOS, Linux or Windows build from
[Releases](../../releases/latest).

Voice generation uses MLX and currently runs on Apple Silicon.

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
