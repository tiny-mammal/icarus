import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { preloadFonts } from './vite/preload-fonts';
import { pwa } from './vite/pwa';

// Tauri injects this when targeting a physical device on the LAN; otherwise undefined.
const host = process.env.TAURI_DEV_HOST;

// Extra hostnames the dev server may be reached by, comma-separated — e.g. a
// `tailscale serve` HTTPS name (`.ts.net`), which gives browser mode the secure
// context that password protection needs.
const allowedHosts = process.env.ICARUS_ALLOWED_HOSTS?.split(',').map((h) => h.trim()).filter(Boolean);

/**
 * When this build's source was committed, for the monthly "look for an
 * update" reminder. The commit date keeps release builds reproducible; a
 * checkout without git falls back to now.
 */
function builtAt(): string {
  try {
    return execSync('git log -1 --format=%cI', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return new Date().toISOString();
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte(), tailwindcss(), preloadFonts(), ...pwa()],
  define: { __ICARUS_BUILT_AT__: JSON.stringify(builtAt()) },

  // Tauri expects a fixed port and owns the terminal output, so don't let Vite
  // clear the screen or hop ports.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    allowedHosts,
    hmr: host
      ? { protocol: 'ws', host, port: 1421 }
      : undefined,
    // The Rust side has its own watcher; ignore it to avoid noisy reloads.
    watch: { ignored: ['**/src-tauri/**'] },
  },

  // Produce a clean, debuggable build without leaking source paths in prod.
  build: {
    target: 'esnext',
    sourcemap: !!process.env.TAURI_DEBUG,
    minify: process.env.TAURI_DEBUG ? false : 'esbuild',
  },
});
