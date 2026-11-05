/**
 * Shared by the landing page mockups kept in `site/mockups/` (directions that
 * were not chosen, served unlisted at /mockups/). Brings in the download
 * button labels and the site's motion helpers.
 */
import '../main';

export { onScrollProgress, reducedMotion } from '../motion';

/** `Saturday, October 24, 2026` for an ISO `YYYY-MM-DD` date. */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
