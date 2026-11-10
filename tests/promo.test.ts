import { describe, expect, it, vi } from 'vitest';
import { promoFunnel } from '../site/promo-event';
import { linkStep } from '../site/promo';
import worker from '../site/worker';

// The funnel's contract is tested in @martinezharo/promo-funnel; these cover
// what is Icarus's own.

describe('promoFunnel', () => {
  it('counts the visit, the downloads and the web app', () => {
    expect(promoFunnel.promo).toBe('icarus');
    expect(promoFunnel.steps).toEqual(['arrive', 'stay-10s', 'stay-1m', 'stay-3m', 'open-download', 'download', 'open-app']);
  });
});

describe('linkStep', () => {
  const origin = 'https://icarus.4oli.com';
  const at = (href: string) => linkStep(new URL(href, origin), origin);

  it('counts build downloads and the web app', () => {
    expect(at('/download/windows-setup')).toBe('download');
    expect(at('/download/windows-setup?version=0.7.0')).toBe('download');
    expect(at('/app/')).toBe('open-app');
  });

  it('ignores the download page itself and other links', () => {
    expect(at('/download')).toBeNull();
    expect(at('/')).toBeNull();
    expect(at('https://github.com/app/')).toBeNull();
  });
});

describe('POST /api/promo-event', () => {
  const env = () => ({
    ASSETS: { fetch: vi.fn() },
    RELEASES: { get: vi.fn(), head: vi.fn() },
    PROMO_ANALYTICS: { writeDataPoint: vi.fn() },
  });
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    new Request('https://icarus.4oli.com/api/promo-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  const event = { event: 'download', promo: 'icarus', source: 'backrooms', placement: 'death', locale: 'es', variant: 'encrypted-diary' };

  it('writes an Icarus step in the shared schema', async () => {
    const e = env();
    const response = await worker.fetch(post(event, { Origin: 'https://icarus.4oli.com' }), e);
    expect(response.status).toBe(204);
    expect(e.PROMO_ANALYTICS.writeDataPoint).toHaveBeenCalledWith({
      blobs: ['download', 'backrooms', 'icarus', 'death', 'es', 'encrypted-diary'],
      doubles: [1],
      indexes: ['icarus'],
    });
  });

  it('refuses another site’s steps', async () => {
    const e = env();
    expect((await worker.fetch(post({ ...event, event: 'sign-in' }), e)).status).toBe(400);
    expect((await worker.fetch(post({ ...event, promo: 'blitz' }), e)).status).toBe(400);
    expect(e.PROMO_ANALYTICS.writeDataPoint).not.toHaveBeenCalled();
  });
});
