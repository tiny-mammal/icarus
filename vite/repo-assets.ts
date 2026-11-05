import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const repo = fileURLToPath(new URL('..', import.meta.url));

const CONTENT_TYPES: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  webmanifest: 'application/manifest+json',
  js: 'text/javascript',
};

/** Content type for a served file name, by extension. */
function contentType(fileName: string): string {
  return CONTENT_TYPES[fileName.split('.').pop() ?? ''] ?? 'application/octet-stream';
}

/**
 * Serve and emit files that live elsewhere in the repository (brand images in
 * `public/` and the Tauri icon set) under their public names, instead of
 * keeping copies that could drift. `assets` maps the public file name to a
 * path relative to the repository root.
 */
export function repoAssets(name: string, assets: Record<string, string>): Plugin {
  let base = '/';
  return {
    name,
    configResolved(config) {
      base = config.base;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0];
        const source = path.startsWith(base) ? assets[path.slice(base.length)] : undefined;
        if (!source) return next();
        res.setHeader('Content-Type', contentType(source));
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
