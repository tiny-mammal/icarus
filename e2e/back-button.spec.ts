import { expect, test, type Page } from '@playwright/test';
import { importPlainIcs, searchResult } from './helpers';

/**
 * Back (browser, PWA or Android) closes the top-most open layer instead of
 * leaving the app, and only leaves once nothing is open.
 */

const DIARY_ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//icarus//EN',
  'BEGIN:VEVENT',
  'UID:a@icarus.diary',
  'DTSTART;VALUE=DATE:20260620',
  'SUMMARY:Midsummer',
  'END:VEVENT',
  'END:VCALENDAR',
  '',
].join('\r\n');

const dayPane = (page: Page) => page.getByRole('complementary');
const settings = (page: Page) => page.getByRole('dialog', { name: 'Settings' });
const search = (page: Page) => page.getByPlaceholder('Search entries…');

/** Imported diary, then the Midsummer day opened from the search. */
async function openDay(page: Page): Promise<void> {
  await importPlainIcs(page, DIARY_ICS);
  await search(page).fill('Midsummer');
  await searchResult(page, 'Midsummer').click();
  await expect(dayPane(page).getByRole('article').getByText('Midsummer')).toBeVisible();
}

test('back closes layers one at a time, then leaves the app', async ({ page }) => {
  await openDay(page);

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(settings(page)).toBeVisible();

  await page.goBack();
  await expect(settings(page)).toBeHidden();
  await expect(dayPane(page).getByRole('article')).toBeVisible();

  await page.goBack();
  await expect(dayPane(page).getByRole('article')).toBeHidden();
  await expect(search(page)).toBeVisible();

  // Nothing is open: back now leaves the app for the page before it.
  await page.goBack();
  await expect(page).toHaveURL('about:blank');
});

test('back closes the search results', async ({ page }) => {
  await importPlainIcs(page, DIARY_ICS);
  await search(page).fill('Midsummer');
  const result = page.getByRole('listbox').or(page.getByText('Midsummer').first());
  await expect(result.first()).toBeVisible();

  await page.goBack();
  await expect(search(page)).toHaveValue('');
  await expect(search(page)).toBeVisible();
});

test('closing from the UI leaves no extra history entry behind', async ({ page }) => {
  await openDay(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await settings(page).getByRole('button', { name: 'Close' }).click();
  await expect(settings(page)).toBeHidden();
  await dayPane(page).getByRole('button', { name: 'Close' }).click();
  await expect(dayPane(page).getByRole('article')).toBeHidden();

  await page.goBack();
  await expect(page).toHaveURL('about:blank');
});

test('back from writing started on the calendar returns to the calendar', async ({ page }) => {
  await importPlainIcs(page, DIARY_ICS);
  await page.getByRole('button', { name: /^New entry$/ }).click();
  const title = page.getByPlaceholder('Title', { exact: true });
  await expect(title).toBeVisible();
  await title.fill('Unfinished');

  // One back closes the editor and the pane it opened in, keeping the draft.
  await page.goBack();
  await expect(title).toBeHidden();
  await expect(dayPane(page)).toBeHidden();
  await expect(page.getByRole('button', { name: /Drafts/ })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL('about:blank');
});
