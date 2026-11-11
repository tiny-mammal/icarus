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
  return serializeIcs({
    entries: entries.map((e, i) => ({
      uid: e.uid ?? `e${i}@icarus.diary`,
      date: localDay(e.date),
      title: e.title,
      content: e.body ?? '',
      location: e.location,
    })),
  });
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
 * Open the day pane on `date` (`YYYY-MM-DD`), which must hold an entry. When
 * the day isn't already on screen (in the feed or the calendar), it goes
 * through the calendar, the bottom sheet on phones, and its month/year picker:
 * a few clicks however far back, and no scrolling through a long feed.
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

  if (!(await day.isVisible())) {
    // Phones keep the calendar in a sheet, opened from the feed's month.
    let calendar: Page | Locator = page;
    const sheetOpener = page.getByRole('button', { name: /, open calendar$/ });
    if (await sheetOpener.isVisible()) {
      await sheetOpener.click();
      calendar = page.getByRole('dialog', { name: 'Calendar' });
      await expect(calendar).toBeVisible();
    }
    await showMonth(calendar, y, m);
  }
  await day.click();
  await expect(page.getByRole('complementary')).toBeVisible();
}

/** Turn the calendar in `scope` to month `m` (1–12) of year `y` via its picker. */
async function showMonth(scope: Page | Locator, y: number, m: number): Promise<void> {
  await scope
    .locator('button[aria-haspopup="dialog"]')
    .filter({ hasText: /\d{4}/, visible: true })
    .first()
    .click();
  const picker = scope.getByRole('dialog', { name: 'Select month and year' });
  const year = picker.getByText(/^\d{4}$/);
  const shown = Number(await year.textContent());
  const step = picker.getByRole('button', { name: y < shown ? 'Previous year' : 'Next year' });
  for (let i = 0; i < Math.abs(y - shown); i++) await step.click();
  await expect(year).toHaveText(String(y));
  // The twelve month buttons are the only toggles, January first.
  await picker.locator('button[aria-pressed]').nth(m - 1).click();
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
