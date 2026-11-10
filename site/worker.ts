/**
 * Edge entry for icarus.4oli.com. Every page is a static asset; this Worker
 * only runs for `/`, `/download/*` and `/api/*` (see `run_worker_first` in
 * `wrangler.jsonc`):
 *  - `/` serves `index.md` to agents that ask for Markdown.
 *  - `/download/<asset>` streams the latest build of that asset from R2
 *    (`?version=` pins an earlier release), and `/download/latest.json`
 *    describes the current release.
 *  - `POST /api/promo-event` counts a step of the promo funnel
 *    (`site/promo-event.ts`).
 */
import { handlePromoEvent, type PromoDataset } from '@martinezharo/promo-funnel/worker';
import { promoFunnel } from './promo-event';
import { MANIFEST_KEY, isReleaseManifest, releasedAsset, type ReleaseManifest } from './releases';

/** The slice of the R2 binding this Worker uses. */
interface R2Object {
  size: number;
  httpEtag: string;
  range?: { offset?: number; length?: number; suffix?: number };
}

interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  json<T>(): Promise<T>;
}

interface R2Bucket {
  get(key: string, options?: { range?: Headers }): Promise<R2ObjectBody | null>;
  head(key: string): Promise<R2Object | null>;
}

interface Env {
  ASSETS: { fetch(input: Request | URL | string, init?: RequestInit): Promise<Response> };
  RELEASES: R2Bucket;
  /** The `promo_events` dataset, shared with the author's other sites. */
  PROMO_ANALYTICS: PromoDataset;
}

const DOWNLOAD_PREFIX = '/download/';
/** `/download/<id>` moves to a new file on every release; recheck it soon. */
const LATEST_CACHE = 'public, max-age=300';
/** Published releases never change (see `check-latest` in the workflow). */
const PINNED_CACHE = 'public, max-age=31536000, immutable';

/** True when the client ranks `text/markdown` above `text/html`. */
function prefersMarkdown(accept: string): boolean {
  const quality = (type: string) => {
    for (const part of accept.split(',')) {
      const [media, ...params] = part.trim().split(';');
      if (media.trim().toLowerCase() !== type) continue;
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      return q ? Number(q.slice(2)) || 0 : 1;
    }
    return -1;
  };
  const markdown = quality('text/markdown');
  return markdown > 0 && markdown >= quality('text/html');
}

async function markdownHome(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const markdown = await env.ASSETS.fetch(new URL('/index.md', url));
  const response = new Response(markdown.body, markdown);
  response.headers.set('Content-Type', 'text/markdown; charset=utf-8');
  response.headers.set('Vary', 'Accept');
  response.headers.set('Content-Location', '/index.md');
  return response;
}

async function readManifest(env: Env): Promise<ReleaseManifest | null> {
  const object = await env.RELEASES.get(MANIFEST_KEY);
  if (!object) return null;
  const manifest: unknown = await object.json();
  return isReleaseManifest(manifest) ? manifest : null;
}

function notFound(message = 'No release is available yet.'): Response {
  return new Response(message, {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function serveDownload(
  request: Request,
  env: Env,
  id: string,
  version: string | null,
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  const manifest = await readManifest(env);
  if (!manifest) return notFound();

  if (id === MANIFEST_KEY) {
    return new Response(request.method === 'HEAD' ? null : JSON.stringify(manifest), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': LATEST_CACHE },
    });
  }

  const pinned = version !== null && version !== manifest.version;
  // A pinned earlier release is located by name; only the current manifest
  // carries checksums.
  const asset: { key: string; name: string; sha256?: string } | null | undefined = pinned
    ? releasedAsset(id, version)
    : Object.hasOwn(manifest.assets, id) ? manifest.assets[id] : undefined;
  if (!asset) return notFound('There is no such download.');

  const headers = new Headers({
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${asset.name}"`,
    'Cache-Control': version !== null ? PINNED_CACHE : LATEST_CACHE,
    'Accept-Ranges': 'bytes',
  });
  if (asset.sha256) {
    // Lets download managers and curl users check the file they received.
    headers.set('Repr-Digest', `sha-256=:${hexToBase64(asset.sha256)}:`);
  }

  if (request.method === 'HEAD') {
    const object = await env.RELEASES.head(asset.key);
    if (!object) return notFound();
    headers.set('Content-Length', String(object.size));
    headers.set('ETag', object.httpEtag);
    return new Response(null, { headers });
  }

  // Passing the request headers lets R2 answer `Range`, so interrupted
  // downloads can resume. R2 ignores `If-Range`, though: when a resumed
  // download started on an earlier release, send the whole current file
  // instead of splicing two releases together.
  let rangeHeaders: Headers | undefined = request.headers;
  const ifRange = request.headers.get('If-Range');
  if (ifRange !== null && request.headers.has('Range')) {
    const current = await env.RELEASES.head(asset.key);
    if (!current) return notFound();
    if (ifRange !== current.httpEtag) rangeHeaders = undefined;
  }
  const object = await env.RELEASES.get(asset.key, rangeHeaders && { range: rangeHeaders });
  if (!object) return notFound();
  headers.set('ETag', object.httpEtag);
  const range = object.range;
  if (range && rangeHeaders?.has('Range')) {
    const offset = range.offset ?? (range.suffix !== undefined ? object.size - range.suffix : 0);
    const length = range.length ?? object.size - offset;
    headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set('Content-Length', String(length));
    return new Response(object.body, { status: 206, headers });
  }
  headers.set('Content-Length', String(object.size));
  return new Response(object.body, { headers });
}

function hexToBase64(hex: string): string {
  const bytes = hex.match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [];
  return btoa(String.fromCharCode(...bytes));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/' && prefersMarkdown(request.headers.get('Accept') ?? '')) {
      return markdownHome(request, env);
    }
    if (url.pathname === '/api/promo-event') return handlePromoEvent(request, env.PROMO_ANALYTICS, promoFunnel);
    if (url.pathname.startsWith(DOWNLOAD_PREFIX)) {
      const id = url.pathname.slice(DOWNLOAD_PREFIX.length);
      if (id && !id.includes('/')) {
        return serveDownload(request, env, id, url.searchParams.get('version'));
      }
    }
    return env.ASSETS.fetch(request);
  },
};
