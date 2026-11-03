import { expect, test, type Page } from '@playwright/test';
import { importPlainIcs } from './helpers';

/**
 * The day pane's day stepper jumps between days that hold entries (skipping
 * empty ones and crossing months), while the entry pager stays within a day.
 */

function vevent(uid: string, date: string, title: string): string[] {
  return [
    'BEGIN:VEVENT',
    `UID:${uid}@icarus.diary`,
    `DTSTART;VALUE=DATE:${date}`,
    `SUMMARY:${title}`,
    'END:VEVENT',
  ];
}

const DIARY_ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//icarus//EN',
  ...vevent('a', '20251231', 'New year eve'),
  ...vevent('b', '20260608', 'Morning walk'),
  ...vevent('c', '20260608', 'Evening swim'),
  ...vevent('d', '20260620', 'Midsummer'),
  'END:VCALENDAR',
  '',
].join('\r\n');

async function importDiary(page: Page): Promise<void> {
  await importPlainIcs(page, DIARY_ICS);
}

async function openFromSearch(page: Page, title: string): Promise<void> {
  await page.getByPlaceholder('Search entries…').fill(title);
  await page.getByText(title).first().click();
  await expect(page.getByRole('article').getByText(title)).toBeVisible();
}

const heading = (page: Page) => page.getByRole('complementary').getByRole('heading', { level: 2 });
const article = (page: Page) => page.getByRole('complementary').getByRole('article');

test('steps between days with entries and between entries of a day', async ({ page }) => {
  await importDiary(page);
  await openFromSearch(page, 'Midsummer');

  const prevDay = page.getByRole('button', { name: 'Previous day' });
  const nextDay = page.getByRole('button', { name: 'Next day' });

  // Last day: nothing later.
  await expect(nextDay).toBeDisabled();

  // Skips the empty days between 20 and 8 June, and opens on the first entry.
  await prevDay.click();
  await expect(heading(page)).toContainText('2026');
  await expect(article(page)).toContainText('Morning walk');
  await expect(page.getByText('1 / 2')).toBeVisible();
  await page.screenshot({ path: 'test-results/day-navigation-pane.png' });

  // The entry pager stays on the same day.
  await page.getByRole('button', { name: 'Next entry' }).click();
  await expect(article(page)).toContainText('Evening swim');
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(article(page)).toContainText('Morning walk');

  // ← crosses into the previous year and moves the calendar along with it.
  await page.keyboard.press('ArrowLeft');
  await expect(article(page)).toContainText('New year eve');
  await expect(prevDay).toBeDisabled();
  await expect(page.getByText('December 2025')).toBeVisible();
  await expect(page.getByText('1 / 2')).toBeHidden();

  await page.keyboard.press('ArrowRight');
  await expect(article(page)).toContainText('Morning walk');

  // Full-screen reader carries the same controls.
  await page.getByRole('button', { name: 'View full screen' }).click();
  await expect(page.getByRole('button', { name: 'Exit full screen' })).toBeVisible();
  await page.waitForTimeout(300); // let the fade-in settle for the screenshot
  await page.screenshot({ path: 'test-results/day-navigation-fullscreen.png' });
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'Midsummer' }).last()).toBeVisible();
});

test('writes a new entry on the open day, including empty days', async ({ page }) => {
  await importDiary(page);
  await openFromSearch(page, 'Midsummer');

  // A day with entries offers "+" in the header to add another one.
  await page.waitForTimeout(350); // let the pane slide in for the screenshot
  await page.screenshot({ path: 'test-results/day-compose-header.png' });
  await page.getByRole('button', { name: 'New entry on this day' }).click();
  await expect(page.getByRole('button', { name: /^Sat, .*20.*2026$/ })).toBeVisible();
  await page.keyboard.press('Escape'); // collapse the dock
  await page.keyboard.press('Escape'); // close the day pane

  // An empty day offers the same action from its empty state.
  await page.getByRole('button', { name: /^Tuesday, June 16/ }).click();
  await expect(page.getByText('No entries on this day yet.')).toBeVisible();
  await page.waitForTimeout(350); // let the pane slide in for the screenshot
  await page.screenshot({ path: 'test-results/day-compose-empty.png' });
  await page.getByRole('button', { name: 'Write an entry for this day' }).click();
  await expect(page.getByRole('button', { name: /^Tue, .*16.*2026$/ })).toBeVisible();
  await page.waitForTimeout(350); // let the dock slide up for the screenshot
  await page.screenshot({ path: 'test-results/day-compose-dock.png' });
});

test('narrow screens show the short day label so header actions fit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await importDiary(page);
  await openFromSearch(page, 'Midsummer');

  await expect(heading(page).getByText(/^(Jun 20|20 Jun), 2026$/)).toBeVisible();
  await expect(heading(page).getByText(/^Saturday/)).toBeHidden();
  await page.waitForTimeout(350); // let the pane slide in for the screenshot
  await page.screenshot({ path: 'test-results/day-pane-mobile.png' });
});

test('date format preference rewrites day labels and survives a reload', async ({ page }) => {
  await importDiary(page);
  await openFromSearch(page, 'Midsummer');

  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog');
  await settings.getByRole('button', { name: /Year first/ }).click();
  await expect(settings.getByRole('button', { name: /Year first/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.waitForTimeout(250); // let the dialog transition settle for the screenshot
  await page.screenshot({ path: 'test-results/date-format-settings.png' });

  await settings.getByRole('button', { name: 'Close' }).click();
  await expect(settings).toBeHidden();
  await expect(heading(page)).toContainText('2026-06-20');
  await page.waitForTimeout(350); // let the backdrop fade out for the screenshot
  await page.screenshot({ path: 'test-results/date-format-iso.png' });

  // The choice is persisted with the other preferences.
  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: /Year first/ }),
  ).toHaveAttribute('aria-pressed', 'true');
});
