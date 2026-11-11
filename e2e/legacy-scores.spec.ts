import { expect, test, type Page } from '@playwright/test';
import { dateKey } from '../src/lib/date';
import { diaryIcs, importPlainIcs } from './helpers';

/**
 * The temporary import of scores written by hand inside entries: seven taps on
 * the App heading in Settings open it, what is certain goes in at once and each
 * doubtful day is read and scored by hand. Entries are made up.
 */

function day(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return dateKey(d);
}

const DIARY_ICS = diaryIcs([
  { date: day(-5), title: 'Quiet one', body: 'Walked a lot.\n\n(6) 2DAC\n\nEarly night.' },
  { date: day(-4), title: 'Rough day', body: 'Bad day. 4DSC. (3)' },
  { date: day(-3), title: 'Typo day', body: 'Slow morning.\n\n(3) 2DAC' },
  { date: day(-2), title: 'Morning', body: 'First half. (6) 2DAC' },
  { date: day(-2), title: 'Evening', body: 'Second half. (8) 3DAC' },
  { date: day(-1), title: 'Plain', body: 'Nothing scored here.' },
]);

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Import old scores' });
const tile = (page: Page, label: string) =>
  dialog(page).getByText(label, { exact: true }).locator('..');

async function openImport(page: Page): Promise<void> {
  const heading = page.getByRole('heading', { name: 'App', exact: true });
  // Closing the import leaves Settings open under it.
  if (!(await heading.isVisible())) await page.getByRole('button', { name: 'Settings' }).click();
  for (let tap = 0; tap < 7; tap++) await heading.click();
  await expect(dialog(page)).toBeVisible();
}

test('seven taps on the App heading open it; fewer do not', async ({ page }) => {
  await importPlainIcs(page, DIARY_ICS);
  await page.getByRole('button', { name: 'Settings' }).click();
  const heading = page.getByRole('heading', { name: 'App', exact: true });
  for (let tap = 0; tap < 6; tap++) await heading.click();
  await expect(dialog(page)).toHaveCount(0);
  await heading.click();
  await expect(dialog(page)).toBeVisible();
});

test('imports the certain scores and settles the doubtful days by hand', async ({ page }) => {
  await importPlainIcs(page, DIARY_ICS);
  await openImport(page);

  // Four of the five days have a mark: two are certain, two need a look.
  await expect(tile(page, 'Marks')).toContainText('4');
  await expect(tile(page, 'Marks')).toContainText('in 5 days');
  await expect(tile(page, 'Ready')).toContainText('2');
  await expect(tile(page, 'To review')).toContainText('2');

  await dialog(page).getByRole('button', { name: 'Import 2 scores' }).click();
  await expect(tile(page, 'Ready')).toContainText('0');

  // The oldest doubtful day first: its letter says passed, its score says failed.
  const review = dialog(page).getByRole('region', { name: 'Day to review' });
  await expect(review).toContainText('The letter and the score disagree');
  await expect(review).toContainText('1 of 2');
  await expect(review.locator('mark')).toHaveText('(3) 2DAC');
  await expect(review).toContainText('Slow morning.');
  await page.keyboard.press('5');

  // Then the day with two different scores, both entries shown with their marks lit.
  await expect(review).toContainText('more than one score');
  await expect(review).toContainText('2 of 2');
  await expect(review.locator('mark')).toHaveText(['(6) 2DAC', '(8) 3DAC']);
  await review.getByRole('button', { name: 'Score 6' }).click();

  await expect(dialog(page)).toContainText('Nothing left to review.');

  // The scores 6, 3, 5 and 6 are in the statistics.
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Statistics' }).click();
  await page.getByRole('dialog', { name: 'Statistics' }).getByRole('button', { name: 'Tracking' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Statistics' }).getByText('Avg. score', { exact: true }).locator('..'),
  ).toContainText('5');
});

test('skipping a day leaves it unscored, and a second import changes nothing', async ({ page }) => {
  await importPlainIcs(page, DIARY_ICS);
  await openImport(page);
  await dialog(page).getByRole('button', { name: 'Import 2 scores' }).click();

  await page.keyboard.press('s');
  await page.keyboard.press('s');
  await expect(dialog(page)).toContainText('Nothing left to review.');
  await expect(dialog(page).getByRole('button', { name: /^Import 0/ })).toBeDisabled();

  // Closed and opened again, the skipped days are back to be settled.
  await page.keyboard.press('Escape');
  await openImport(page);
  await expect(tile(page, 'Ready')).toContainText('0');
  await expect(tile(page, 'To review')).toContainText('2');
});
