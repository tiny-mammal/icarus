# Icarus Diary

A local-first diary that keeps your entries in a plain `.ics` file. No account,
no server, no sync service.

Runs on desktop (Windows, macOS, Linux), Android, and in the browser at
<https://icarus.4oli.com/app/>. Downloads are at
<https://icarus.4oli.com/download>.

- Calendar view, Markdown editor, and instant search across years of entries.
- Your diary is a file in a folder you choose, readable by any calendar app.
- Optional password protection with a recovery key.

See [docs/privacy.md](docs/privacy.md) for where data lives and what
encryption does and doesn't protect.

## Development

Needs Node.js, pnpm, and Rust (pinned in `rust-toolchain.toml`). Linux desktop
builds also need the WebKitGTK 4.1 development libraries.

```bash
pnpm install
pnpm dev:seed     # browser app with a sample diary
pnpm tauri:dev    # desktop app
pnpm test         # unit tests
```

More in [docs/development.md](docs/development.md). Releasing is covered in
[docs/releases.md](docs/releases.md).

Built with Tauri 2, Svelte 5, and TypeScript.

## License

[GPL-3.0-or-later](LICENSE)
