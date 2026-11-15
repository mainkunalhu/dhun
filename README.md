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

Early build. The shell, theme, splash and project library are in place. Voice
generation is next.

- [x] Electron + React shell with a typed IPC boundary
- [x] Theme and component baseline
- [x] Splash / first-run screen
- [x] Local project folders: create, rename, favorite, delete
- [ ] Script editor and take grid
- [ ] MLX voice engine (Python sidecar)
- [ ] WAV / MP3 export

## Stack

Electron, React, TypeScript, Vite, Tailwind CSS v4.

## Development

```bash
bun install
bun run start
```

Other scripts: `bun run typecheck`, `bun run lint`, `bun run icons`,
`bun run package`.

## Where data lives

Projects are plain folders, not a database:

```
~/Library/Application Support/Dhun/projects/
└── week-32-reel/
    └── project.json
```

## License

MIT
