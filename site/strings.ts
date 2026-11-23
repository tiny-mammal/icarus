/**
 * The messages the page scripts need, in the page's language. The build
 * embeds them in each page as JSON (see `i18n/plugin.ts`), so no other
 * language is ever downloaded.
 */
import type { SiteMessages } from './i18n';
import { formatMessage, type Params } from '../src/lib/i18n/format';

export const lang = document.documentElement.lang || 'en';

export const strings: SiteMessages['client'] = JSON.parse(
  document.getElementById('site-strings')?.textContent ?? '{}',
);

export function fmt(message: string, params?: Params): string {
  return formatMessage(lang, message, params);
}
