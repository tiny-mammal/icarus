/**
 * Message formatting shared by the app and the public site: `{name}`
 * placeholders, plural forms picked by the language's own rules, and cached
 * `Intl` formatters (building one costs far more than using it).
 */

/**
 * A message whose wording depends on `count`, keyed by CLDR plural category.
 * English needs `one` and `other`; French, Italian and Spanish may add `many`
 * (used for round millions).
 */
export interface Plural {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

export type Message = string | Plural;

/**
 * Values for a message's placeholders. Numbers are written with the
 * language's digit grouping, so pass years and other identifiers as strings.
 */
export type Params = Record<string, string | number>;

/** Declare a plural message (keeps the categories typed in catalogs). */
export function plural(forms: Plural): Plural {
  return forms;
}

const cache = new Map<string, Intl.PluralRules | Intl.NumberFormat | Intl.DateTimeFormat>();

function cached<T extends Intl.PluralRules | Intl.NumberFormat | Intl.DateTimeFormat>(
  key: string,
  build: () => T,
): T {
  let value = cache.get(key) as T | undefined;
  if (!value) cache.set(key, (value = build()));
  return value;
}

export function numberFormat(locale: string, options: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  return cached(`n|${locale}|${JSON.stringify(options)}`, () => new Intl.NumberFormat(locale, options));
}

export function dateTimeFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return cached(`d|${locale}|${JSON.stringify(options)}`, () => new Intl.DateTimeFormat(locale, options));
}

function pluralRules(locale: string): Intl.PluralRules {
  return cached(`p|${locale}`, () => new Intl.PluralRules(locale));
}

/** Fill in `message` for `locale`, choosing the plural form from `params.count`. */
export function formatMessage(locale: string, message: Message, params: Params = {}): string {
  let template: string;
  if (typeof message === 'string') {
    template = message;
  } else {
    const count = Number(params.count ?? 0);
    const category = pluralRules(locale).select(count) as keyof Plural;
    template = message[category] ?? message.other;
  }
  if (!template.includes('{')) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    if (value === undefined) return match;
    return typeof value === 'number' ? numberFormat(locale).format(value) : value;
  });
}
