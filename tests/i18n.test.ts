import { describe, expect, it } from 'vitest';
import { formatMessage, plural } from '../src/lib/i18n/format';
import { LOCALES, localizedPath, matchLocale, regionalTag } from '../src/lib/i18n/locales';
import en from '../src/lib/i18n/messages/en';
import es from '../src/lib/i18n/messages/es';
import it_ from '../src/lib/i18n/messages/it';
import fr from '../src/lib/i18n/messages/fr';
import de from '../src/lib/i18n/messages/de';
import { SITE_MESSAGES } from '../site/i18n';

describe('locales', () => {
  it('matches the first supported language, ignoring regions', () => {
    expect(matchLocale(['pt-BR', 'es-MX', 'en'])).toBe('es');
    expect(matchLocale(['de_AT'])).toBe('de');
    expect(matchLocale(['ja', 'zh'])).toBeNull();
  });

  it('keeps the user’s regional variant for dates and numbers', () => {
    expect(regionalTag('en', ['en-GB', 'es'])).toBe('en-GB');
    expect(regionalTag('es', ['en-GB', 'es-MX'])).toBe('es-MX');
    expect(regionalTag('fr', ['en-GB'])).toBe('fr');
  });

  it('puts every language but English under its own folder', () => {
    expect(localizedPath('/download', 'en')).toBe('/download');
    expect(localizedPath('/download', 'fr')).toBe('/fr/download');
    expect(localizedPath('/', 'de')).toBe('/de/');
  });
});

describe('formatMessage', () => {
  const entries = plural({ one: '{count} entry', other: '{count} entries' });

  it('fills placeholders and groups numbers the language’s way', () => {
    expect(formatMessage('en', entries, { count: 1 })).toBe('1 entry');
    expect(formatMessage('en', entries, { count: 1046 })).toBe('1,046 entries');
    expect(formatMessage('de', entries, { count: 1046 })).toBe('1.046 entries');
    expect(formatMessage('en', 'Version {version}', { version: '2026' })).toBe('Version 2026');
  });

  it('picks plural forms by the language’s rules', () => {
    const fr = plural({ one: '{count} entrée', other: '{count} entrées' });
    expect(formatMessage('fr', fr, { count: 0 })).toBe('0 entrée');
    expect(formatMessage('en', entries, { count: 0 })).toBe('0 entries');
  });

  it('leaves unknown placeholders visible', () => {
    expect(formatMessage('en', 'Hello {name}')).toBe('Hello {name}');
  });
});

/** Every string in a catalog, by its key path. */
function leaves(node: unknown, path = ''): Map<string, unknown> {
  const out = new Map<string, unknown>();
  if (typeof node === 'string') out.set(path, node);
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      for (const [p, v] of leaves(value, path ? `${path}.${key}` : key)) out.set(p, v);
    }
  }
  return out;
}

/** What a translation must keep: placeholders, tags, emphasis markers. */
function skeleton(message: string) {
  return {
    placeholders: [...message.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort(),
    tags: [...message.matchAll(/<\/?([a-z]+)/g)].map((m) => m[0]).sort(),
    emphasis: (message.match(/\*/g) ?? []).length,
  };
}

describe.each([
  ['es', es, SITE_MESSAGES.es],
  ['it', it_, SITE_MESSAGES.it],
  ['fr', fr, SITE_MESSAGES.fr],
  ['de', de, SITE_MESSAGES.de],
] as const)('%s catalogs', (_locale, app, site) => {
  for (const [name, source, translation] of [
    ['app', en, app],
    ['site', SITE_MESSAGES.en, site],
  ] as const) {
    it(`has the same ${name} messages as English, with the same placeholders and markup`, () => {
      const english = leaves(source);
      const translated = leaves(translation);
      // Plural forms may differ by language; everything else must line up.
      const strip = (keys: Iterable<string>) =>
        [...new Set([...keys].map((key) => key.replace(/\.(zero|one|two|few|many|other)$/, '')))].sort();
      expect(strip(translated.keys())).toEqual(strip(english.keys()));
      for (const [key, value] of translated) {
        const pluralForm = /\.(zero|one|two|few|many|other)$/.test(key);
        const original = english.get(key.replace(/\.(zero|one|two|few|many)$/, '.other')) ?? english.get(key);
        const got = skeleton(value as string);
        const want = skeleton(original as string);
        if (!pluralForm) {
          expect(got, key).toEqual(want);
          continue;
        }
        // A singular may spell the number out ("un día"), so `{count}` is optional there.
        expect(got.tags, key).toEqual(want.tags);
        expect(want.placeholders, key).toEqual(expect.arrayContaining(got.placeholders));
      }
    });
  }
});

it('covers every supported language', () => {
  expect(Object.keys(SITE_MESSAGES).sort()).toEqual([...LOCALES].sort());
});
