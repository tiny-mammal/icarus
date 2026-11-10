/**
 * The promo funnel: what a visitor who arrived from a promo for Icarus on one
 * of the author's other sites went on to do here. The contract, the page
 * tracker and the Worker handler are shared with the other promoted sites
 * (@martinezharo/promo-funnel); this names Icarus's own steps.
 *
 * Imported by both the page (`site/promo.ts`) and the Worker
 * (`site/worker.ts`). Only the public site reports steps; the diary app at
 * `/app/` sends nothing.
 */
import { definePromoFunnel } from '@martinezharo/promo-funnel';

export const promoFunnel = definePromoFunnel('icarus', [
  // The download page was opened.
  'open-download',
  // A desktop or Android build was downloaded.
  'download',
  // A link to the web app was followed.
  'open-app',
]);
