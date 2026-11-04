import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { preloadFonts } from '../vite/preload-fonts';

/**
 * Build for the public site at icarus.4oli.com.
 *
 * Output goes to `dist-web/`. `pnpm build:web` then builds the diary app into
 * `dist-web/app/`, so the landing page and the web app ship as one static
 * deployment (see `wrangler.jsonc`).
 */
const root = fileURLToPath(new URL('.', import.meta.url));
const repo = fileURLToPath(new URL('..', import.meta.url));

/**
 * Brand images live with the app (`public/favicon.svg`) and the Tauri icon
 * set. Emit them from there instead of keeping copies that could drift.
 */
function sharedBrandAssets(): Plugin {
  const assets: Record<string, string> = {
    'favicon.svg': 'public/favicon.svg',
    'apple-touch-icon.png': 'src-tauri/icons/ios/AppIcon-60x60@3x.png',
    'icon-512.png': 'src-tauri/icons/icon.png',
  };
  return {
    name: 'icarus-shared-brand-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const source = assets[(req.url ?? '').replace(/^\//, '')];
        if (!source) return next();
        res.setHeader('Content-Type', source.endsWith('.svg') ? 'image/svg+xml' : 'image/png');
        res.end(readFileSync(repo + source));
      });
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(assets)) {
        this.emitFile({ type: 'asset', fileName, source: readFileSync(repo + source) });
      }
    },
  };
}

export default defineConfig({
  root,
  publicDir: 'public',
  plugins: [tailwindcss(), sharedBrandAssets(), preloadFonts()],
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
      },
    },
  },
});
