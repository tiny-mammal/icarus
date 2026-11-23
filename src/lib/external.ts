import { openUrl } from '@tauri-apps/plugin-opener';
import { i18n } from './i18n/index.svelte';
import { localizedPath } from './i18n/locales';

/** The public download page, with every native build, in the app's language. */
export function downloadPage(): string {
  return `https://icarus.4oli.com${localizedPath('/download', i18n.locale)}`;
}

/** Public home of the project, linked from the settings dialog. */
export const SOURCE_REPO = { label: 'tiny-mammal/icarus', url: 'https://github.com/tiny-mammal/icarus' };

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
