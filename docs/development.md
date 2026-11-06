# Development

```bash
pnpm dev             # browser app on port 1420 (IndexedDB)
pnpm dev:seed        # browser app with an in-memory sample diary
pnpm tauri:dev       # desktop app
pnpm test            # unit tests (Vitest)
pnpm test:e2e        # end-to-end tests (Playwright)
pnpm check           # svelte-check and TypeScript
```

`dev:seed` generates about three years of entries and discards every change on
reload. `VITE_SEED_YEARS=20 pnpm dev:seed` makes a longer history.

## E2E tests

Install the browser once with `pnpm exec playwright install chromium`.

The suite runs on a non-loopback HTTP address on purpose, because the browser
app has to keep working on plain-HTTP LAN addresses where secure-context APIs
are missing. Encryption tests need a secure context, so they only run with
`ICARUS_E2E_HOST=127.0.0.1` (as CI does). `ICARUS_E2E_PORT` picks another
port.

To reach a dev server over HTTPS from other devices, use `tailscale serve` and
`ICARUS_ALLOWED_HOSTS=.ts.net pnpm dev --host`.

## Android

Needs JDK 17, the Android SDK and NDK, and the Rust Android targets (see the
`android` job in `.github/workflows/release.yml`).

```bash
pnpm tauri android build --debug --apk --target x86_64   # emulator
pnpm tauri android build --apk                           # release
```

## Public site

`site/` is the landing page at <https://icarus.4oli.com>, with the browser app
under `/app/`. One Cloudflare Worker serves both and streams `/download/*`
from the `icarus-releases` R2 bucket.

```bash
pnpm dev:site        # landing page on port 1440
pnpm preview:web     # full deployment locally with Wrangler
pnpm deploy:web      # deploy
```
