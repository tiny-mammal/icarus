/**
 * Renders the public site in every language. Each page in `site/` is a
 * template; English is built at its own path (`/`, `/download`) and every
 * other language under its own folder (`/es/`, `/es/download`), each a plain
 * static page that search engines index on its own.
 *
 * Template syntax:
 *   {{home.title}}         message, HTML-escaped (`home.steps.0.title` indexes lists)
 *   {{{home.heroTitle}}}   message with its inline HTML kept
 *   {{@home}}              a value computed per page (see `computed`)
 *
 * The plugin also emits `sitemap.xml`, listing every page with its language
 * alternates.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import { DEFAULT_LOCALE, LOCALES, LOCALE_NAMES, isLocale, localizedPath, type Locale } from '../../src/lib/i18n/locales';
import { SITE_MESSAGES, type SiteMessages } from '.';

export const ORIGIN = 'https://icarus.4oli.com';

/** Template files, by page. `indexed` pages get alternates and a sitemap entry. */
const PAGES = {
  index: { indexed: true },
  download: { indexed: true },
  404: { indexed: false },
} as const;
type Page = keyof typeof PAGES;

/** Where a page lives in `locale`. */
export function pagePath(page: Page, locale: Locale): string {
  return localizedPath(page === 'index' ? '/' : `/${page}`, locale);
}

/** The page and language a built HTML path belongs to: `/es/download.html`. */
function pageOf(htmlPath: string): { page: Page; locale: Locale } {
  const parts = htmlPath.replace(/^\//, '').replace(/\.html$/, '').split('/');
  const locale = parts.length > 1 && isLocale(parts[0]) ? parts.shift()! : DEFAULT_LOCALE;
  const page = (parts[0] || 'index') as Page;
  if (!(page in PAGES)) throw new Error(`site i18n: no template for ${htmlPath}`);
  return { page, locale: locale as Locale };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function lookup(messages: SiteMessages, path: string): string {
  const value = path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], messages);
  if (typeof value !== 'string') throw new Error(`site i18n: no message at "${path}"`);
  return value;
}

function alternates(page: Page): string {
  return [
    ...LOCALES.map((locale) => `<link rel="alternate" hreflang="${locale}" href="${ORIGIN}${pagePath(page, locale)}" />`),
    `<link rel="alternate" hreflang="x-default" href="${ORIGIN}${pagePath(page, DEFAULT_LOCALE)}" />`,
  ].join('\n    ');
}

/** The language menu: the same page in every language. */
function languageMenu(page: Page, current: Locale, messages: SiteMessages): string {
  const target = page === '404' ? 'index' : page;
  const items = LOCALES.map((locale) => {
    const active = locale === current;
    return `<li><a href="${pagePath(target, locale)}" hreflang="${locale}" lang="${locale}"${active ? ' aria-current="true"' : ''}>${LOCALE_NAMES[locale]}</a></li>`;
  }).join('');
  return `<details class="lang-menu" data-lang-menu>
            <summary aria-label="${escapeHtml(messages.nav.language)}: ${LOCALE_NAMES[current]}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"/></svg>
              <span class="lang-menu-current">${LOCALE_NAMES[current]}</span>
            </summary>
            <ul>${items}</ul>
          </details>`;
}

/** Search engine structured data for the home page, in its language. */
function jsonLd(locale: Locale, messages: SiteMessages): string {
  const home = `${ORIGIN}${pagePath('index', locale)}`;
  const graph = [
    {
      '@type': 'WebSite',
      '@id': `${ORIGIN}/#website`,
      url: `${ORIGIN}/`,
      name: 'Icarus',
      inLanguage: [...LOCALES],
      publisher: { '@id': `${ORIGIN}/#author` },
    },
    {
      '@type': 'WebPage',
      '@id': `${home}#webpage`,
      url: home,
      name: messages.home.title,
      description: messages.home.description,
      inLanguage: locale,
      isPartOf: { '@id': `${ORIGIN}/#website` },
      about: { '@id': `${ORIGIN}/#app` },
    },
    { '@type': 'Person', '@id': `${ORIGIN}/#author`, name: 'Oliver Martínez', url: 'https://github.com/martinezharo' },
    {
      '@type': 'SoftwareApplication',
      '@id': `${ORIGIN}/#app`,
      name: 'Icarus',
      alternateName: 'Icarus Diary',
      url: home,
      description: messages.schema.appDescription,
      applicationCategory: 'LifestyleApplication',
      applicationSubCategory: 'Diary',
      operatingSystem: 'Windows, macOS, Linux, Android, Web browser',
      downloadUrl: `${ORIGIN}${pagePath('download', locale)}`,
      isAccessibleForFree: true,
      inLanguage: [...LOCALES],
      license: 'https://www.gnu.org/licenses/gpl-3.0.html',
      screenshot: `${ORIGIN}/shots/calendar.webp`,
      image: `${ORIGIN}/og-image.png`,
      author: { '@id': `${ORIGIN}/#author` },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: messages.schema.features,
    },
    {
      '@type': 'SoftwareSourceCode',
      '@id': `${ORIGIN}/#source`,
      name: 'Icarus source code',
      codeRepository: 'https://github.com/tiny-mammal/icarus',
      license: 'https://www.gnu.org/licenses/gpl-3.0.html',
      programmingLanguage: ['TypeScript', 'Svelte', 'Rust'],
      targetProduct: { '@id': `${ORIGIN}/#app` },
      author: { '@id': `${ORIGIN}/#author` },
    },
    {
      '@type': 'FAQPage',
      '@id': `${home}#faq`,
      inLanguage: locale,
      mainEntity: messages.home.faq.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ];
  return jsonScript({ '@context': 'https://schema.org', '@graph': graph }, 'application/ld+json');
}

/** A JSON data block. It never runs, so the page's CSP doesn't apply. */
function jsonScript(value: unknown, type: string, id?: string): string {
  const json = JSON.stringify(value).replace(/</g, '\\u003c');
  return `<script type="${type}"${id ? ` id="${id}"` : ''}>${json}</script>`;
}

function computed(page: Page, locale: Locale, messages: SiteMessages): Record<string, () => string> {
  return {
    lang: () => locale,
    ogLocale: () => messages.ogLocale,
    ogAlternates: () =>
      LOCALES.filter((other) => other !== locale)
        .map((other) => `<meta property="og:locale:alternate" content="${SITE_MESSAGES[other].ogLocale}" />`)
        .join('\n    '),
    canonical: () => `${ORIGIN}${pagePath(page, locale)}`,
    alternates: () => (PAGES[page].indexed ? alternates(page) : ''),
    home: () => pagePath('index', locale),
    downloadPage: () => pagePath('download', locale),
    // The web app starts in this language (see `loadLanguage` in the store).
    app: () => (locale === DEFAULT_LOCALE ? '/app/' : `/app/?lang=${locale}`),
    languages: () => languageMenu(page, locale, messages),
    jsonLd: () => jsonLd(locale, messages),
    clientStrings: () => jsonScript(messages.client, 'application/json', 'site-strings'),
  };
}

export function renderPage(html: string, htmlPath: string): string {
  const { page, locale } = pageOf(htmlPath);
  const messages = SITE_MESSAGES[locale];
  const values = computed(page, locale, messages);
  return html.replace(/\{\{(\{)?\s*(@?[\w.]+)\s*\}?\}\}/g, (_, raw: string | undefined, key: string) => {
    if (key.startsWith('@')) {
      const value = values[key.slice(1)];
      if (!value) throw new Error(`site i18n: unknown value {{${key}}} in ${htmlPath}`);
      return value();
    }
    const message = lookup(messages, key);
    return raw ? message : escapeHtml(message);
  });
}

/** When the site's content last changed, for the sitemap. */
function lastModified(): string {
  try {
    return execSync('git log -1 --format=%cs -- site', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function sitemap(): string {
  const lastmod = lastModified();
  const urls = (Object.keys(PAGES) as Page[])
    .filter((page) => PAGES[page].indexed)
    .flatMap((page) =>
      LOCALES.map((locale) => {
        const links = [...LOCALES.map((other) => [other, other] as const), ['x-default', DEFAULT_LOCALE] as const]
          .map(([hreflang, other]) => `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${ORIGIN}${pagePath(page, other)}" />`)
          .join('\n');
        return `  <url>\n    <loc>${ORIGIN}${pagePath(page, locale)}</loc>\n    <lastmod>${lastmod}</lastmod>\n${links}\n  </url>`;
      }),
    );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}

export function localizedSite(): Plugin {
  let root = '';
  const translated = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);
  /** Absolute path of a page that only exists here, mapped to its template. */
  const virtualPages = new Map<string, string>();

  return {
    name: 'icarus-site-i18n',
    config(config) {
      root = config.root!;
      const input = config.build?.rollupOptions?.input as Record<string, string>;
      for (const locale of translated) {
        for (const page of Object.keys(PAGES)) {
          const id = `${root}${locale}/${page}.html`;
          virtualPages.set(id, `${root}${page}.html`);
          input[`${locale}/${page}`] = id;
        }
      }
    },
    resolveId(id) {
      return virtualPages.has(id) ? id : null;
    },
    load(id) {
      const template = virtualPages.get(id);
      return template ? readFileSync(template, 'utf8') : null;
    },
    transformIndexHtml: {
      order: 'pre',
      handler: (html, ctx) => renderPage(html, ctx.path),
    },
    configureServer(server) {
      // `/es/`, `/es/download`: render the template as the build would.
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        const match = url.match(/^\/([a-z]{2})(?:\/(download|404)?(?:\.html)?)?$/);
        if (!match || !translated.includes(match[1] as Locale)) return next();
        if (url === `/${match[1]}`) {
          res.writeHead(301, { Location: `/${match[1]}/` });
          return res.end();
        }
        const page = match[2] ?? 'index';
        try {
          const template = readFileSync(`${root}${page}.html`, 'utf8');
          const html = await server.transformIndexHtml(`/${match[1]}/${page}.html`, template, req.originalUrl);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(html);
        } catch (err) {
          next(err);
        }
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap() });
    },
  };
}
