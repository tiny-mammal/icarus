/**
 * Browser sniffing shared by the app and the public site. Only a hint for
 * which instructions or download to show first: every platform stays one
 * click away on the download page.
 */

/** The systems with a native build on the download page. */
export type PlatformId = 'windows' | 'macos' | 'linux' | 'android';

export const PLATFORM_NAMES: Record<PlatformId, string> = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  android: 'Android',
};

interface NavigatorUAData {
  platform?: string;
}

/** iPhone, iPad or iPod, including iPadOS, which reports itself as a Mac. */
export function isAppleMobile(nav: Navigator = navigator): boolean {
  return /iphone|ipad|ipod/i.test(nav.userAgent) || (/macintosh/i.test(nav.userAgent) && nav.maxTouchPoints > 1);
}

/** The native build this device can run, or `null` where only the web app works. */
export function detectPlatform(nav: Navigator = navigator): PlatformId | null {
  const hint = (nav as Navigator & { userAgentData?: NavigatorUAData }).userAgentData?.platform;
  const source = `${hint ?? ''} ${nav.userAgent}`.toLowerCase();
  // Mobile first: Android also reports Linux, and iPadOS reports a Mac.
  if (source.includes('android')) return 'android';
  if (isAppleMobile(nav)) return null;
  if (source.includes('win')) return 'windows';
  if (source.includes('mac')) return 'macos';
  // ChromeOS and the BSDs also report X11 but can't run these Linux builds.
  if (/cros|bsd/.test(source)) return null;
  if (source.includes('linux') || source.includes('x11')) return 'linux';
  return null;
}
