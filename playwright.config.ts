import { defineConfig, devices } from '@playwright/test';
import { createHash } from 'node:crypto';
import os from 'node:os';

/**
 * Browser-mode E2E configuration.
 *
 * The suite intentionally runs against a non-loopback HTTP origin: browsers
 * only expose secure-context APIs (`crypto.randomUUID`, `showSaveFilePicker`,
 * …) over HTTPS or localhost, and that is exactly where the browser storage
 * backend must degrade gracefully. Override the address with `ICARUS_E2E_HOST`
 * when the host to use differs from the one the dev server is bound to.
 */
// Each checkout gets its own stable port, derived from its path, so Playwright
// never silently reuses another worktree's dev server (and tests the wrong
// code) on the shared default 1420. `ICARUS_E2E_PORT` overrides it.
function checkoutPort(): number {
  const hash = createHash('sha256').update(import.meta.dirname).digest();
  return 20_000 + (hash.readUInt16BE(0) % 10_000);
}

const PORT = Number(process.env.ICARUS_E2E_PORT) || checkoutPort();

function nonLoopbackHost(): string {
  const addresses = Object.values(os.networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter((entry) => entry.family === 'IPv4' && !entry.internal)
    .map((entry) => entry.address);
  // Prefer a Tailscale/CGNAT address: that is how this fleet reaches its apps.
  return addresses.find((address) => address.startsWith('100.')) ?? addresses[0] ?? '127.0.0.1';
}

const host =
  process.env.ICARUS_E2E_HOST ?? process.env.TAURI_DEV_HOST ?? nonLoopbackHost();
const baseURL = `http://${host}:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // The Android smoke test drives an emulator instead (playwright.android.config.ts).
  testIgnore: '**/android/**',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm exec vite --host ${host} --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [{
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      // CI uses the Chrome supplied by the hosted runner; local runs retain
      // Playwright's bundled Chromium unless explicitly requested otherwise.
      channel: process.env.ICARUS_E2E_CHANNEL === 'chrome' ? 'chrome' : undefined,
    },
  }],
});
