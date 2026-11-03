import { openUrl } from '@tauri-apps/plugin-opener';

/** Public home of the project, linked from the settings dialog. */
export const SOURCE_REPO = { label: 'martinezharo/icarus', url: 'https://github.com/martinezharo/icarus' };

/**
 * Open an external URL in the system browser via Tauri's opener plugin (the
 * app's webview would either block it by CSP or navigate away from the app).
 * Outside Tauri (e.g. `pnpm dev` in a browser) it falls back to `window.open`.
 */
export async function openExternal(url: string): Promise<void> {
  try {
    await openUrl(url);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
