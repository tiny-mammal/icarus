import { expect, test, type Page } from '@playwright/test';
import { dateKey } from '../src/lib/date';
import { diaryIcs, importPlainIcs } from './helpers';

/**
 * The statistics modal: headline totals, the period selector, the characters
 * chart and the top-days ranking. Dates are relative to today so the
 * assertions hold whenever the suite runs.
 */

/** The day `offsetDays` from today (negative = the past). */
function day(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return dateKey(d);
}

// Bodies are chosen so totals are known: today holds 11 characters (two
// entries), 40 days ago holds 3, 400 days ago holds 10.
const DIARY_ICS = diaryIcs([
  { date: day(0), title: 'Morning walk', body: 'hello' },
  { date: day(0), title: 'Evening swim', body: 'world!' },
  { date: day(-40), title: 'Midsummer', body: 'abc' },
  { date: day(-400), title: 'New year eve', body: '0123456789' },
]);

async function importDiary(page: Page): Promise<void> {
  await importPlainIcs(page, DIARY_ICS);
}

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Statistics' });
const card = (page: Page, label: string) =>
  dialog(page).getByText(label, { exact: true }).locator('..');

async function switchPeriod(page: Page, option: string): Promise<void> {
  await dialog(page).locator('button[aria-haspopup="listbox"]').click();
  await page.getByRole('option', { name: option }).click();
}

test('shows totals, chart and top days for the selected period', async ({ page }) => {
  await importDiary(page);
  await page.getByRole('button', { name: 'Statistics' }).click();
  await expect(dialog(page)).toBeVisible();

  // All time is the default: 4 entries and 24 characters across three days.
  await expect(card(page, 'Entries')).toContainText('4');
  await expect(card(page, 'Characters')).toContainText('24');
  await expect(card(page, 'Avg. entry')).toContainText('6');
  await expect(card(page, 'Best day')).toContainText('11 characters');
  await expect(
    dialog(page).getByRole('img', { name: 'Characters written over the selected period' }),
  ).toBeVisible();

  const top = dialog(page).locator('ol > li').first();
  await expect(top).toContainText('11');
  await expect(dialog(page).locator('ol > li')).toHaveCount(3);

  // Only today falls inside the last 30 days.
  await switchPeriod(page, 'Last 30 days');
  await expect(card(page, 'Entries')).toContainText('2');
  await expect(card(page, 'Characters')).toContainText('11');
  await expect(card(page, 'Avg. entry')).toContainText('6'); // 5.5 rounds up

  // The trailing year adds the entry from 40 days ago.
  await switchPeriod(page, 'Last year');
  await expect(card(page, 'Entries')).toContainText('3');
  await expect(card(page, 'Characters')).toContainText('14');
});

test('a custom range narrows the statistics to the days picked', async ({ page }) => {
  await importDiary(page);
  await page.getByRole('button', { name: 'Statistics' }).click();
  await dialog(page).locator('button[aria-haspopup="listbox"]').click();
  await page.getByRole('option', { name: 'Custom range…' }).click();

  // The picker opens on the period on show (all time), which ends today.
  // Moving just the start keeps that end. Its field shows the current start,
  // 400 days ago, so page forward to 40 days ago and pick it.
  const picker = page.getByRole('dialog', { name: 'Custom range' });
  await picker.getByRole('button', { name: /^From / }).click();
  const start = picker.locator(`[data-key="${day(-40)}"]`);
  for (let i = 0; i < 15 && !(await start.isVisible()); i++) {
    await picker.getByRole('button', { name: 'Next month' }).click();
  }
  await start.click();
  await expect(picker).toContainText('41 days');
  await expect(picker).toContainText('2 with entries');
  await picker.getByRole('button', { name: 'Apply' }).click();

  await expect(picker).toBeHidden();
  await expect(card(page, 'Entries')).toContainText('3');
  await expect(card(page, 'Characters')).toContainText('14');

  // The custom range is now the chosen option, and Escape only closes the menu.
  await dialog(page).locator('button[aria-haspopup="listbox"]').click();
  await expect(page.getByRole('option', { name: /Custom range/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(dialog(page)).toBeVisible();
});

test('a ranking row opens that day and Escape closes the modal', async ({ page }) => {
  await importDiary(page);
  await page.getByRole('button', { name: 'Statistics' }).click();
  await expect(dialog(page)).toBeVisible();

  // The top day is today, so its first entry should open in the reader.
  await dialog(page).locator('ol > li button').first().click();
  await expect(dialog(page)).toBeHidden();
  await expect(page.getByRole('article').getByText('Morning walk')).toBeVisible();

  await page.getByRole('button', { name: 'Statistics' }).click();
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
});
