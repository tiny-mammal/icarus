/**
 * Guess the visitor's operating system to put the right download first.
 * Only a hint: every platform stays one click away on the download page.
 */
import type { PlatformId } from './releases';

export const PLATFORM_NAMES: Record<PlatformId, string> = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  android: 'Android',
};

interface NavigatorUAData {
  platform?: string;
}

export function detectPlatform(nav: Navigator = navigator): PlatformId | null {
  const hint = (nav as Navigator & { userAgentData?: NavigatorUAData }).userAgentData?.platform;
  const source = `${hint ?? ''} ${nav.userAgent}`.toLowerCase();
  // Mobile first: Android also reports Linux, and iPadOS reports a Mac.
  if (source.includes('android')) return 'android';
  if (/iphone|ipad|ipod/.test(source)) return null;
  if (source.includes('mac') && nav.maxTouchPoints > 1) return null;
  if (source.includes('win')) return 'windows';
  if (source.includes('mac')) return 'macos';
  // ChromeOS and the BSDs also report X11 but can't run these Linux builds.
  if (/cros|bsd/.test(source)) return null;
  if (source.includes('linux') || source.includes('x11')) return 'linux';
  return null;
}
