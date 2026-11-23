/**
 * The app's language: which catalog is showing, and the helpers components
 * use to read and fill in its messages.
 *
 *   import { t, fmt } from '../lib/i18n/index.svelte';
 *   {t.settings.title}
 *   {fmt(t.settings.entryCount, { count: app.entries.length })}
 *
 * `t` reads the current catalog through reactive state, so anything rendered
 * from it updates when the language changes. English ships in the main bundle
 * (it is also the fallback); every other catalog is loaded when chosen.
 */
import en, { type Messages } from './messages/en';
import { formatMessage, numberFormat, dateTimeFormat, type Message, type Params } from './format';
import { DEFAULT_LOCALE, isLocale, matchLocale, regionalTag, systemLanguages, type Locale } from './locales';
import { setFormatLocaleReader } from './current';

export type { Messages, Message, Params, Locale };

const catalogs = import.meta.glob<{ default: Messages }>(['./messages/*/index.ts', '!./messages/en/index.ts']);

async function loadCatalog(locale: Locale): Promise<Messages> {
  if (locale === 'en') return en;
  const load = catalogs[`./messages/${locale}/index.ts`];
  return load ? (await load()).default : en;
}

/** The language the system (or browser) asks for, when Icarus speaks it. */
export function systemLocale(): Locale {
  return matchLocale(systemLanguages()) ?? DEFAULT_LOCALE;
}

class I18n {
  /** The language showing. */
  locale = $state<Locale>(DEFAULT_LOCALE);
  /** The tag dates and numbers are written with, e.g. `en-GB`. */
  formatLocale = $state<string>(regionalTag(DEFAULT_LOCALE, systemLanguages()));
  messages = $state.raw<Messages>(en);

  private request = 0;

  /** Switch to `locale`, once its catalog has loaded. */
  async use(locale: Locale): Promise<void> {
    const request = ++this.request;
    const messages = await loadCatalog(locale);
    // A later choice wins over a slower earlier load.
    if (request !== this.request) return;
    this.messages = messages;
    this.locale = locale;
    this.formatLocale = regionalTag(locale, systemLanguages());
    if (typeof document !== 'undefined') document.documentElement.lang = locale;
  }
}

export const i18n = new I18n();
setFormatLocaleReader(() => i18n.formatLocale);

/** The current catalog, one getter per namespace so reads stay reactive. */
export const t = {} as Messages;
for (const namespace of Object.keys(en) as (keyof Messages)[]) {
  Object.defineProperty(t, namespace, { enumerable: true, get: () => i18n.messages[namespace] });
}

/** Fill in a message's placeholders (and pick its plural form from `count`). */
export function fmt(message: Message, params?: Params): string {
  return formatMessage(i18n.formatLocale, message, params);
}

/** A number written the way the current language writes it. */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return numberFormat(i18n.formatLocale, options).format(value);
}

/** A cached date formatter for the current language. */
export function dateFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return dateTimeFormat(i18n.formatLocale, options);
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase(i18n.locale) + text.slice(1);
}

function displayName(locale: Locale): string {
  try {
    return new Intl.DisplayNames([i18n.locale], { type: 'language' }).of(locale) ?? locale;
  } catch {
    return locale;
  }
}

/** A language's name in the current language, capitalised: "Alemán". */
export function languageName(locale: Locale): string {
  return capitalize(displayName(locale));
}

/** Several languages named in a sentence, in the current language: "Español e inglés". */
export function languageList(locales: readonly Locale[]): string {
  const names = locales.map(displayName);
  try {
    return capitalize(new Intl.ListFormat(i18n.locale, { type: 'conjunction' }).format(names));
  } catch {
    return capitalize(names.join(', '));
  }
}

/** A `?lang=` hint in the page address (the public site's links to the web app). */
export function addressLocale(): Locale | null {
  if (typeof location === 'undefined') return null;
  const lang = new URLSearchParams(location.search).get('lang');
  return isLocale(lang) ? lang : null;
}
