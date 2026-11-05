/**
 * Browser sniffing shared by the app and the public site (`site/platform.ts`).
 * Only used to pick which instructions or download to show first.
 */

/** iPhone, iPad or iPod, including iPadOS, which reports itself as a Mac. */
export function isAppleMobile(nav: Navigator = navigator): boolean {
  return /iphone|ipad|ipod/i.test(nav.userAgent) || (/macintosh/i.test(nav.userAgent) && nav.maxTouchPoints > 1);
}
