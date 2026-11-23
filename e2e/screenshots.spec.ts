import { test, type Page } from '@playwright/test';
import { serializeIcs } from '../src/lib/ical';
import { seedEntries, seedTracker } from '../src/lib/seed';
import { diaryIcs, hideToasts, importPlainIcs, openDay, SAMPLE_ENTRY, SAMPLE_TRACKER } from './helpers';
import { LOCALE_NAMES, isLocale } from '../src/lib/i18n/locales';
import type { Messages } from '../src/lib/i18n/messages/en';
import en from '../src/lib/i18n/messages/en';
import es from '../src/lib/i18n/messages/es';
import it from '../src/lib/i18n/messages/it';
import fr from '../src/lib/i18n/messages/fr';
import de from '../src/lib/i18n/messages/de';

/**
 * Screenshots of the main screens on a phone and a desktop, for PRs and
 * design reviews: `pnpm screenshots` writes them to `screenshots/`. Skipped
 * by the regular suite. Add a scene here rather than writing a throwaway spec.
 */

const DIR = process.env.SCREENSHOTS_DIR;
test.skip(!DIR, 'Run with `pnpm screenshots`.');

/**
 * `SCREENSHOTS_LOCALE=es` switches the app to that language (through
 * Settings, as a person would) and captures the scenes that show it.
 */
const LOCALE = process.env.SCREENSHOTS_LOCALE ?? 'en';
if (!isLocale(LOCALE)) throw new Error(`Unknown SCREENSHOTS_LOCALE: ${LOCALE}`);
const m: Messages = { en, es, it, fr, de }[LOCALE];

/** A short paragraph with one misspelling, to show that language's spell check. */
const MISSPELLED: Record<typeof LOCALE, { text: string; typo: string }> = {
  en: { text: 'We walked along the river and had dinner with my frends.', typo: 'frends' },
  es: { text: 'Paseamos junto al río y cenamos con mis amigso en la plaza.', typo: 'amigso' },
  it: { text: 'Abbiamo passeggiato lungo il fiume e cenato con gli amcii.', typo: 'amcii' },
  fr: { text: 'Nous avons marché le long du fleuve et dîné avec nos amsi.', typo: 'amsi' },
  de: { text: 'Wir sind am Fluss spazieren gegangen und haben mit Freudnen gegessen.', typo: 'Freudnen' },
};

async function useLanguage(page: Page): Promise<void> {
  if (LOCALE === 'en') return;
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /^Language: / }).click();
  await page.getByRole('option', { name: new RegExp(`^${LOCALE_NAMES[LOCALE]}`) }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: m.nav.settings, exact: true }).waitFor();
}

async function openSettingsAt(page: Page, row: string): Promise<void> {
  await page.getByRole('button', { name: m.nav.settings, exact: true }).click();
  const trigger = page.getByRole('button', { name: new RegExp(`^${row}\\s?:`) });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await page.getByRole('listbox', { name: row }).waitFor();
}

const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  desktop: { width: 1280, height: 800 },
};

/** Scenes that need years of history rather than the one sample entry. */
const LONG_DIARY = serializeIcs({ entries: seedEntries(3), tracker: seedTracker(3) });
const LONG_SCENES = new Set(['stats-writing', 'stats-score', 'stats-habits']);

async function openStatistics(page: Page, view?: 'Tracking'): Promise<void> {
  await page.getByRole('button', { name: 'Statistics' }).click();
  const dialog = page.getByRole('dialog', { name: 'Statistics' });
  if (view) await dialog.getByRole('button', { name: view }).click();
}

const SCENES: Record<string, (page: Page) => Promise<void>> = {
  home: async () => {},
  reader: (page) => openDay(page, SAMPLE_ENTRY.date),
  tracker: async (page) => {
    await openDay(page, SAMPLE_ENTRY.date);
    await page.getByTestId('day-tracker').click();
    await page.getByRole('radiogroup', { name: 'Score' }).waitFor();
  },
  habits: async (page) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('region', { name: 'Score and habits' }).scrollIntoViewIfNeeded();
  },
  'stats-writing': (page) => openStatistics(page),
  'stats-score': (page) => openStatistics(page, 'Tracking'),
  'stats-habits': async (page) => {
    await openStatistics(page, 'Tracking');
    await page.getByRole('heading', { name: 'Habits' }).evaluate((heading) => heading.scrollIntoView({ block: 'start' }));
  },
  editor: async (page) => {
    await openDay(page, SAMPLE_ENTRY.date);
    await page.getByRole('button', { name: 'Edit entry' }).click();
    await page.locator('.ProseMirror').waitFor();
  },
};

/** Scenes in `SCREENSHOTS_LOCALE`, named `<scene>-<locale>-<device>.png`. */
const LOCALIZED_SCENES: Record<string, (page: Page) => Promise<void>> = {
  home: async () => {},
  language: (page) => openSettingsAt(page, m.settings.language),
  spellcheck: (page) => openSettingsAt(page, m.settings.spellcheck),
  spelling: async (page) => {
    const { text, typo } = MISSPELLED[LOCALE];
    await page.getByRole('button', { name: new RegExp(`^${m.editor.newEntry}$`) }).first().click();
    const body = page.locator('.ProseMirror');
    await body.click();
    await body.pressSequentially(text);
    const flagged = body.locator('.spell-misspelled', { hasText: typo });
    await flagged.waitFor();
    await flagged.click({ button: 'right' });
    await page.getByRole('menu').waitFor();
  },
  'stats-writing': async (page) => {
    await page.getByRole('button', { name: m.nav.statistics, exact: true }).click();
  },
};

for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  for (const [scene, show] of Object.entries(LOCALIZED_SCENES)) {
    test(`${scene} in ${LOCALE} on ${device}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await importPlainIcs(page, LONG_SCENES.has(scene) ? LONG_DIARY : diaryIcs([SAMPLE_ENTRY], SAMPLE_TRACKER));
      await hideToasts(page);
      await useLanguage(page);
      await show(page);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${DIR}/${scene}-${LOCALE}-${device}.png` });
    });
  }
}

for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  for (const [scene, show] of Object.entries(SCENES)) {
    test(`${scene} on ${device}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await importPlainIcs(page, LONG_SCENES.has(scene) ? LONG_DIARY : diaryIcs([SAMPLE_ENTRY], SAMPLE_TRACKER));
      await hideToasts(page);
      await show(page);
      // Let pane transitions settle before capturing.
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${DIR}/${scene}-${device}.png` });
    });
  }
}
