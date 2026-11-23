/**
 * The languages Icarus speaks, shared by the app and the public site. Kept
 * free of app state so the site's build and scripts can import it too.
 */

export const LOCALES = ['en', 'es', 'it', 'fr', 'de'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Each language in its own words, as a language picker lists it. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  it: 'Italiano',
  fr: 'Français',
  de: 'Deutsch',
};

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** The primary language subtag of a BCP 47 tag: `es` for `es-MX`. */
function primary(tag: string): string {
  return tag.split(/[-_]/)[0].toLowerCase();
}

/** The first supported language among `tags` (most preferred first), if any. */
export function matchLocale(tags: readonly string[]): Locale | null {
  for (const tag of tags) {
    const lang = primary(tag);
    if (isLocale(lang)) return lang;
  }
  return null;
}

/**
 * The tag dates and numbers are written with: the user's own regional variant
 * of `locale` when they have one (`en-GB` writes 8 June, not June 8), else the
 * bare language.
 */
export function regionalTag(locale: Locale, tags: readonly string[]): string {
  const regional = tags.find((tag) => primary(tag) === locale);
  if (!regional) return locale;
  try {
    return Intl.getCanonicalLocales(regional.replace('_', '-'))[0] ?? locale;
  } catch {
    return locale;
  }
}

/** The languages the system or browser prefers, most preferred first. */
export function systemLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? navigator.languages : [navigator.language].filter(Boolean);
}
