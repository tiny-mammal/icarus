/**
 * Installing the browser version of Icarus as an app (a PWA). The manifest and
 * the offline service worker come from `vite/pwa.ts`; this module registers
 * the worker and works out how this browser installs apps:
 *
 *  - `prompt`: Chromium browsers hand over their own install dialog
 *    (`beforeinstallprompt`), which Settings opens directly.
 *  - `ios`: iPhone and iPad add web apps from the Share sheet.
 *  - `mac-safari`: Safari 17+ on macOS adds web apps to the Dock.
 *  - `manual`: anything else; Settings explains where browsers keep the option.
 *
 * Nothing here runs inside Tauri, where Icarus is already an app.
 */
import { runningUnderTauri } from './runtime';
import { devError } from './log';
import { isAppleMobile } from './user-agent';

export type InstallMethod = 'prompt' | 'ios' | 'mac-safari' | 'manual';

/** Chromium's install prompt event (not in the DOM typings). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Safari on a Mac recent enough to have File > Add to Dock (17+). */
function isMacSafari(nav: Navigator): boolean {
  const ua = nav.userAgent;
  if (!/macintosh/i.test(ua) || nav.maxTouchPoints > 1) return false;
  if (!/safari/i.test(ua) || /chrome|chromium|crios|edg|firefox|fxios|opr/i.test(ua)) return false;
  return Number(/version\/(\d+)/i.exec(ua)?.[1] ?? 0) >= 17;
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
  /** The instructions dialog (every method but `prompt`). */
  helpOpen = $state(false);

  private deferred: BeforeInstallPromptEvent | null = null;

  constructor() {
    if (typeof window === 'undefined' || runningUnderTauri() || runningInstalled()) return;
    this.available = true;
    this.method = isAppleMobile(navigator) ? 'ios' : isMacSafari(navigator) ? 'mac-safari' : 'manual';

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

  /** Install straight away where the browser allows it; otherwise explain how. */
  async start(): Promise<void> {
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
