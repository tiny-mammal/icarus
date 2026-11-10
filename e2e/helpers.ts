import { expect, type Locator, type Page } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { serializeIcs } from '../src/lib/ical';

/** Shared onboarding steps for the browser-mode E2E suites. */

/** Pick "Don't encrypt" in the protection choice and confirm with `action`. */
export async function chooseNoPassword(page: Page, action: string): Promise<void> {
  await page.getByText("Don't encrypt", { exact: true }).click();
  await page.getByRole('button', { name: action }).click();
}

/** Onboard with a fresh, unencrypted browser diary. */
export async function startPlainDiary(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start a new diary' }).click();
  await chooseNoPassword(page, 'Create without password');
  await expect(page.getByRole('button', { name: /^New entry$/ })).toBeVisible();
}

/** An entry for {@link diaryIcs}: `date` is a `YYYY-MM-DD` day. */
export interface TestEntry {
  date: string;
  title: string;
  body?: string;
  location?: string;
  /** Defaults to one derived from the entry's position. */
  uid?: string;
}

/** A local Date for a `YYYY-MM-DD` day, as the app keeps entry days. */
function localDay(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** `.ics` text for `entries`, written by the app's own serializer. */
export function diaryIcs(entries: TestEntry[]): string {
  return serializeIcs(
    entries.map((e, i) => ({
      uid: e.uid ?? `e${i}@icarus.diary`,
      date: localDay(e.date),
      title: e.title,
      content: e.body ?? '',
      location: e.location,
    })),
  );
}

/** A realistic entry with some Markdown, for screenshots and visual checks. */
export const SAMPLE_ENTRY: TestEntry = {
  date: '2026-06-08',
  title: 'Fog over the harbour',
  location: 'Vigo',
  body: [
    'Woke up early and walked to the harbour before anyone else was out. The fog was thick enough that the boats looked like **pencil sketches**.',
    'Later I met Ana for coffee. We talked about the trip to Lisbon and whether we should finally book it.',
    '- Finish the chapter draft\n- Call grandma',
    'A good, quiet day.',
  ].join('\n\n'),
};

/**
 * Open the day pane on `date` (`YYYY-MM-DD`), which must hold an entry: from
 * the feed on phones, from the calendar on wider screens, stepping it to the
 * day's month first.
 */
export async function openDay(page: Page, date: string): Promise<void> {
  const [y, m, d] = date.split('-').map(Number);
  // Formatted in the page, so it matches the app's labels in any locale.
  const label = await page.evaluate(
    ([y, m, d]) =>
      new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(y, m - 1, d)),
    [y, m, d],
  );
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const day = page
    .getByRole('button', { name: new RegExp(`^${escaped}[,:]`) })
    .filter({ visible: true })
    .first();

  const now = new Date();
  const months = (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth());
  const step = page.getByRole('button', { name: months < 0 ? 'Previous month' : 'Next month' });
  if (!(await day.isVisible()) && (await step.isVisible())) {
    // Each step waits for the month label to change: clicks during the
    // paging transition would otherwise be dropped.
    const month = page.locator('button[aria-haspopup="dialog"]').filter({ hasText: /\d{4}/ }).first();
    for (let i = 0; i < Math.abs(months); i++) {
      const shown = await month.textContent();
      await step.click();
      await expect(month).not.toHaveText(shown ?? '');
    }
  }
  await day.click();
  await expect(page.getByRole('complementary')).toBeVisible();
}

/** Pick an `.ics` from the Welcome screen; the protection choice opens next. */
export async function pickIcs(page: Page, ics: string, name = 'diary.ics'): Promise<void> {
  await page.goto('/');
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import a diary/ }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name, mimeType: 'text/calendar', buffer: Buffer.from(ics) });
}

/** Import an `.ics` from the Welcome screen as an unencrypted diary. */
export async function importPlainIcs(page: Page, ics: string, name?: string): Promise<void> {
  await pickIcs(page, ics, name);
  await chooseNoPassword(page, 'Import without password');
  await expect(page.getByRole('button', { name: 'Statistics' })).toBeVisible();
}

/**
 * The search field. Phones fold it into an icon in the top bar, so it is
 * unfolded first there (with `press`, to tap on touch devices).
 */
export async function openSearch(
  page: Page,
  press: (target: Locator) => Promise<void> = (target) => target.click(),
): Promise<Locator> {
  const field = page.getByRole('textbox', { name: 'Search entries' });
  const icon = page.getByRole('banner').getByRole('button', { name: 'Search', exact: true });
  if (await icon.isVisible()) await press(icon);
  else await press(field);
  await expect(field).toBeFocused();
  return field;
}

/**
 * A row of the search results. They show a moment after the query is typed,
 * so a bare text lookup could settle on the same words elsewhere on the page.
 */
export function searchResult(page: Page, text: string): Locator {
  return page.getByRole('banner').getByRole('listitem').filter({ hasText: text }).first();
}

/**
 * Hide notifications for the rest of the test. They sit above everything on
 * purpose, so they can cover what a test points at or checks is on top.
 */
export async function hideToasts(page: Page): Promise<void> {
  await page.addStyleTag({ content: '[aria-label="Notifications"] { display: none; }' });
}
