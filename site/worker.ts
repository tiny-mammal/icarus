/**
 * Edge entry for icarus.4oli.com. Every file is a static asset; this Worker
 * only runs for `/` (see `run_worker_first` in `wrangler.jsonc`) so agents that
 * ask for Markdown get the same page as `index.md`.
 */
interface Env {
  ASSETS: { fetch(input: Request | URL | string, init?: RequestInit): Promise<Response> };
}

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/' && prefersMarkdown(request.headers.get('Accept') ?? '')) {
      const markdown = await env.ASSETS.fetch(new URL('/index.md', url));
      const response = new Response(markdown.body, markdown);
      response.headers.set('Content-Type', 'text/markdown; charset=utf-8');
      response.headers.set('Vary', 'Accept');
      response.headers.set('Content-Location', '/index.md');
      return response;
    }
    return env.ASSETS.fetch(request);
  },
};
