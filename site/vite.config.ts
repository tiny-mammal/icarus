import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { preloadFonts } from '../vite/preload-fonts';
import { repoAssets } from '../vite/repo-assets';
import { localizedSite } from './i18n/plugin';

/**
 * Build for the public site at icarus.4oli.com.
 *
 * Output goes to `dist-web/`. `pnpm build:web` then builds the diary app into
 * `dist-web/app/`, so the landing page and the web app ship as one static
 * deployment (see `wrangler.jsonc`). Every page is also rendered in each
 * other language under `/<locale>/` (see `i18n/plugin.ts`).
 */
const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
  publicDir: 'public',
  plugins: [
    tailwindcss(),
    // Brand images live with the app and the Tauri icon set.
    repoAssets('icarus-shared-brand-assets', {
      'favicon.svg': 'public/favicon.svg',
      'apple-touch-icon.png': 'src-tauri/icons/ios/AppIcon-60x60@3x.png',
      'icon-512.png': 'src-tauri/icons/icon.png',
    }),
    preloadFonts(),
    localizedSite(),
  ],
  server: { port: 1440, strictPort: true },
  build: {
    outDir: '../dist-web',
    emptyOutDir: true,
    target: 'es2022',
    // Never inline assets as data: URIs; the CSP only allows same-origin fonts.
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        index: root + 'index.html',
        404: root + '404.html',
        download: root + 'download.html',
      },
    },
  },
});
