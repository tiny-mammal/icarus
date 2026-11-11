import { test, type Page } from '@playwright/test';
import { serializeIcs } from '../src/lib/ical';
import { seedEntries, seedTracker } from '../src/lib/seed';
import { diaryIcs, hideToasts, importPlainIcs, openDay, SAMPLE_ENTRY, SAMPLE_TRACKER } from './helpers';

/**
 * Screenshots of the main screens on a phone and a desktop, for PRs and
 * design reviews: `pnpm screenshots` writes them to `screenshots/`. Skipped
 * by the regular suite. Add a scene here rather than writing a throwaway spec.
 */

const DIR = process.env.SCREENSHOTS_DIR;
test.skip(!DIR, 'Run with `pnpm screenshots`.');

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
