/**
 * Installing Icarus from the browser version. Where a native build exists,
 * Settings sends people to it; elsewhere it installs the browser version as an
 * app (a PWA), whose manifest and offline service worker come from
 * `vite/pwa.ts`. This module registers the worker and picks the way:
 *
 *  - `download`: Windows, macOS, Linux and Android open the download page.
 *  - `prompt`: Chromium browsers elsewhere (e.g. ChromeOS) hand over their own
 *    install dialog (`beforeinstallprompt`), which Settings opens directly.
 *  - `ios`: iPhone and iPad add web apps from the Share sheet.
 *  - `manual`: anything else; Settings explains where browsers keep the option.
 *
 * Nothing here runs inside Tauri, where Icarus is already an app.
 */
import { runningUnderTauri } from './runtime';
import { devError } from './log';
import { DOWNLOAD_PAGE, openExternal } from './external';
import { detectPlatform, isAppleMobile, type PlatformId } from './user-agent';

export type InstallMethod = 'download' | 'prompt' | 'ios' | 'manual';

/** Chromium's install prompt event (not in the DOM typings). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function runningInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

class Install {
  /** False inside Tauri and once Icarus runs as an installed app. */
  available = $state(false);
  method = $state<InstallMethod>('manual');
  /** The native build to download (`download` only). */
  platform: PlatformId | null = null;
  /** The instructions dialog (`ios` and `manual`). */
  helpOpen = $state(false);

  private deferred: BeforeInstallPromptEvent | null = null;

  constructor() {
    if (typeof window === 'undefined' || runningUnderTauri() || runningInstalled()) return;
    this.available = true;
    this.platform = detectPlatform(navigator);
    if (this.platform) {
      this.method = 'download';
      return;
    }
    this.method = isAppleMobile(navigator) ? 'ios' : 'manual';

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault(); // offered from Settings instead of the browser's own banner
      this.deferred = event as BeforeInstallPromptEvent;
      this.method = 'prompt';
    });
    window.addEventListener('appinstalled', () => {
      this.available = false;
      this.deferred = null;
    });
  }

  /** Open the download page, install straight away where the browser allows it, or explain how. */
  async start(): Promise<void> {
    if (this.platform) {
      await openExternal(`${DOWNLOAD_PAGE}#${this.platform}`);
      return;
    }
    if (!this.deferred) {
      this.helpOpen = true;
      return;
    }
    const event = this.deferred;
    this.deferred = null; // each prompt can be shown once
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === 'dismissed') this.method = 'manual';
  }
}

export const install = new Install();

/** Cache the app for offline use. Production browser builds only. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || runningUnderTauri() || !('serviceWorker' in navigator)) return;
  const register = () =>
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch((err) => devError('registerServiceWorker: could not register', err));
  // After the first screen, so caching never competes with it.
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
