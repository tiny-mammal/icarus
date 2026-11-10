/**
 * The promo funnel on the public site's pages (see `site/promo-event.ts`).
 */
import { createPromoTracker } from '@martinezharo/promo-funnel/page';
import { promoFunnel } from './promo-event';

type Step = (typeof promoFunnel.steps)[number];

/** The step a followed link is, if any: a build download or the web app. */
export function linkStep(link: { pathname: string; origin: string }, pageOrigin: string): Step | null {
  if (link.origin !== pageOrigin) return null;
  if (link.pathname.startsWith('/download/')) return 'download';
  if (link.pathname === '/app' || link.pathname.startsWith('/app/')) return 'open-app';
  return null;
}

/** Run on every page load of the public site, before anything rewrites the URL. */
export function startPromoTracking(): void {
  const promo = createPromoTracker(promoFunnel, { linkStep: (link) => linkStep(link, location.origin) });
  promo.start();
  if (location.pathname === '/download' || location.pathname === '/download/') promo.track('open-download');
}
