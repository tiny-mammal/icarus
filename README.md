# Icarus Diary

Icarus Diary is a local-first diary backed by a plain `.ics` file. On desktop,
you choose a data folder. Icarus keeps `diary.ics`, `drafts.json`, and
`settings.json` in that folder, including when it is on removable media. It
does not remember the folder on the host: choose it again after relaunching.
No account, server, or sync service is required.

The same frontend runs in a plain browser too: the app detects the runtime and
swaps the storage backend (the selected folder via Tauri, IndexedDB in the
browser). Browser mode stores a copy of imported diaries in the browser profile;
use the desktop app when you want control over the data folder.

Built with Tauri 2, Svelte 5, TypeScript, Vite, and Tailwind CSS.

## Capabilities

- Calendar month view with multiple entries per day, a Markdown editor and
  reader, locations, editing, deletion, and undo.
- Local fuzzy search across titles, locations, and entry bodies with
  `Ctrl/Cmd + K`.
- Desktop folder selection, `.ics` import into that folder, and backup export.
- Drafts and preferences persisted beside `diary.ics` on desktop.
- Optional password protection: the diary, drafts and personal dictionary are
  encrypted at rest, with a recovery key, auto-lock and encrypted backups.
- Atomic `.ics` writes on desktop, so a failed save does not replace the
  original file; browser vaults live in IndexedDB and export as `.ics`.
- A private desktop WebView session to avoid retaining browser profile data
  between launches.
- On Linux, GTK and WebKit runtime data uses a private directory in `/dev/shm`
  that is removed on a normal exit. This also keeps chosen paths out of GTK's
  persistent recent-files history. The app requires `/dev/shm` to be available.

## Desktop data and privacy

Choose an existing Icarus folder to open its `diary.ics`, or choose an empty
folder to create one. To bring in an older `.ics`, choose **Import .ics** and
then an empty destination folder. Import copies the entries into that folder's
`diary.ics`; it leaves the original file alone. Icarus will not overwrite an
existing `diary.ics` during import. Backup export also requires a new filename,
so it cannot overwrite an older backup. Keep the chosen folder connected while
editing; failed saves leave the current entry or draft open for retry.

Earlier desktop versions stored `drafts.json` and `settings.json` in Tauri's
application data directory. This release does not read or delete those legacy
files automatically. If you used an earlier version, close Icarus and copy any
legacy `drafts.json` and `settings.json` that belong to this diary into the
chosen folder **before opening it**, provided files with those names are not
already there. The old `icsPath` setting is ignored. Once you have checked the
diary and drafts, you can remove the legacy files from the application's old
data directory. Deleting files does not guarantee physical erasure of earlier
disk contents. The operating system can also write process memory to swap or
hibernation storage; choosing an external folder does not control that behavior.

## Password protection

Creating or importing a diary starts by asking whether to protect it with a
password; choosing encryption writes it encrypted from the start, so it never
reaches the disk in plain text. An existing diary can be protected later from
**Settings → Privacy**. While
protected, the diary, drafts and personal spell-check dictionary are only
stored encrypted; nothing readable is written to the folder or to IndexedDB.
Plain preferences (week start, spell check, auto-lock) stay unencrypted so the
lock screen can use them.

- **Keys.** A random 256-bit master key encrypts everything with AES-256-GCM.
  It is stored wrapped twice: by a key derived from the password with Argon2id
  (64 MiB, 3 passes), and by a 160-bit recovery key shown once during setup.
  Changing the password or recovery key only rewraps the master key.
- **Files.** On desktop the encrypted diary is `diary.icarus`, so calendar
  apps never mistake it for `.ics`. Enabling protection writes and verifies it
  before deleting `diary.ics`; removing protection does the reverse. Backups
  export as encrypted `.icarus` by default, or as plain `.ics` on request.
  Both formats can be imported.
- **Locking.** The diary locks after a chosen period of inactivity (15 minutes
  by default), optionally whenever the window is hidden, or from the lock
  button. Locking saves the open draft encrypted and clears the diary from
  memory.
- **Forgetting.** Without the password or the recovery key the diary cannot be
  recovered.
- **Limits.** Encryption protects data at rest: a stolen disk, a synced folder,
  a copied browser profile. It does not protect an unlocked diary from malware
  or browser extensions running on the same machine. Old unencrypted copies
  (exports, backups, sync history) are not touched; delete them yourself.
- **Browser mode.** Web Crypto only exists in secure contexts, so protection
  needs HTTPS or `localhost`. Over plain HTTP the option is disabled: anyone on
  the network could inject a script that captures the password. To reach a
  dev server over HTTPS from other devices, put it behind `tailscale serve`
  and allow that name: `ICARUS_ALLOWED_HOSTS=.ts.net pnpm dev --host`.

## Development

Requires Node.js, pnpm, Rust 1.98.1 (pinned in `rust-toolchain.toml`), and the
Linux WebKitGTK 4.1/GTK3 development libraries for Linux desktop builds.

```bash
pnpm install
pnpm tauri:dev       # desktop development with hot reload
pnpm dev             # browser mode on port 1420 (IndexedDB storage)
pnpm dev:seed        # browser mode with an in-memory sample diary
pnpm test            # Vitest unit tests
pnpm test:e2e        # browser-mode end-to-end tests (Playwright)
pnpm check           # svelte-check and TypeScript
pnpm tauri:build     # desktop bundle
```

`pnpm dev:seed` opens a deterministic sample diary (about three years of
entries, with gaps and multi-entry days) on an in-memory storage backend:
edits, drafts and settings are discarded on reload, and the real browser vault
is never read or written. Set `VITE_SEED_YEARS` for a longer history, e.g.
`VITE_SEED_YEARS=20 pnpm dev:seed`.

The E2E suite drives the real UI in Chromium. It needs the browser once
(`pnpm exec playwright install chromium`) and serves the app itself. It runs
against a non-loopback HTTP origin on purpose — browsers only expose
secure-context APIs like `crypto.randomUUID` over HTTPS or localhost, and the
browser backend has to keep working on plain-HTTP LAN addresses. Set
`ICARUS_E2E_HOST` to choose the address the dev server should bind, and
`ICARUS_E2E_PORT` when another dev server already uses port 1420. The
encryption flow needs a secure context, so it only runs against a loopback
host (as CI does, with `ICARUS_E2E_HOST=127.0.0.1`).

The data mapping is implemented in [`src/lib/ical.ts`](src/lib/ical.ts), the
pluggable storage backends are in [`src/lib/storage/`](src/lib/storage/), and
the encrypted format is in [`src/lib/crypto/`](src/lib/crypto/).

## Public site

`site/` holds the landing page served at <https://icarus.4oli.com>, with the
browser app under `/app/`. One Cloudflare Worker deployment serves both as
static assets; the Worker script only answers `Accept: text/markdown` requests
for `/` with `index.md`, for agents.

```bash
pnpm dev:site        # landing page with hot reload on port 1440
pnpm build:web       # landing → dist-web/, browser app → dist-web/app/
pnpm preview:web     # build and serve the deployment locally with Wrangler
pnpm deploy:web      # build and deploy to icarus.4oli.com
```

`site/public/_headers` sets the security headers, including a strict
Content-Security-Policy for the app that keeps every request on the same origin.

## License

Icarus is free software under the [GNU General Public License v3](LICENSE) or
any later version.
