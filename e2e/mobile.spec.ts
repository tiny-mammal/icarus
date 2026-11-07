import { devices, expect, test, type CDPSession, type Page } from '@playwright/test';
import { importPlainIcs, openSearch, startPlainDiary } from './helpers';

/**
 * Phone layout: every entry in one feed with a calendar sheet to jump around,
 * swipes that page through months and days, and bottom sheets that close on
 * a pull-down. Touches go through CDP so they are real touch events.
 */

const { defaultBrowserType: _, ...pixel } = devices['Pixel 7'];
test.use(pixel);

const DIARY_ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//icarus//EN',
  'BEGIN:VEVENT',
  'UID:a@icarus.diary',
  'DTSTART;VALUE=DATE:20260608',
  'SUMMARY:Morning walk',
  'LOCATION:Lisbon',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:b@icarus.diary',
  'DTSTART;VALUE=DATE:20260620',
  'SUMMARY:Midsummer',
  'END:VEVENT',
  'END:VCALENDAR',
  '',
].join('\r\n');

async function drag(cdp: CDPSession, from: [number, number], to: [number, number], ms = 160) {
  const steps = 8;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from[0], y: from[1] }] });
  for (let i = 1; i <= steps; i++) {
    const x = from[0] + ((to[0] - from[0]) * i) / steps;
    const y = from[1] + ((to[1] - from[1]) * i) / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    await new Promise((r) => setTimeout(r, ms / steps));
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test('lists every entry, jumps through the calendar sheet and swipes days', async ({ page, context }) => {
  await importPlainIcs(page, DIARY_ICS);
  const cdp = await context.newCDPSession(page);

  // Every entry, newest first, under its month.
  const feed = page.getByRole('region', { name: 'Entries' });
  const entries = feed.getByRole('listitem').getByRole('button');
  await expect(entries).toHaveText([/Midsummer/, /Morning walk/]);
  await expect(entries.nth(1)).toContainText('Lisbon');

  // Opening an entry from the feed, then swiping to the next day with entries.
  await entries.nth(1).click();
  const pane = page.getByRole('complementary');
  await expect(pane.getByRole('article')).toContainText('Morning walk');
  // Let the pane finish sliding in before swiping across it.
  await pane.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  await drag(cdp, [340, 500], [60, 510]);
  await expect(pane.getByRole('article')).toContainText('Midsummer');
  await pane.getByRole('button', { name: 'Close' }).click();

  // The pinned month opens the calendar on it; it pages with a swipe.
  await feed.getByRole('button', { name: 'June 2026, open calendar' }).click();
  const sheet = page.getByRole('dialog', { name: 'Calendar' });
  await sheet.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const month = sheet.locator('button[aria-haspopup="dialog"]');
  await expect(month).toContainText('June 2026');
  const grid = (await sheet.locator('[data-daykey]').first().boundingBox())!;
  await drag(cdp, [340, grid.y + 60], [60, grid.y + 70]);
  await expect(month).toContainText('July 2026');
  await drag(cdp, [60, grid.y + 60], [340, grid.y + 70]);
  await expect(month).toContainText('June 2026');

  // Picking a day closes the sheet and opens it. A tap right after a swipe
  // counts as the finger lifting, so wait for the page to settle first.
  await page.waitForTimeout(450);
  await sheet.getByRole('button', { name: /Midsummer$/ }).click();
  await expect(sheet).toBeHidden();
  await expect(pane.getByRole('article')).toContainText('Midsummer');
  await pane.getByRole('button', { name: 'Close' }).click();

  // Settings opens as a bottom sheet that closes when pulled down.
  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await expect(settings).toBeVisible();
  await settings.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const box = (await settings.boundingBox())!;
  await drag(cdp, [200, box.y + 16], [200, box.y + 260], 320);
  await expect(settings).toBeHidden();
});

test('search unfolds from its icon over the whole top bar', async ({ page }) => {
  await importPlainIcs(page, DIARY_ICS);
  const bar = page.getByRole('banner');
  const icon = bar.getByRole('button', { name: 'Search', exact: true });
  await expect(page.getByRole('textbox', { name: 'Search entries' })).toHaveCount(0);

  const field = await openSearch(page, (target) => target.tap());
  await expect(icon).toHaveAttribute('aria-expanded', 'true');
  // Wider than any slot the actions would have left it.
  const width = page.viewportSize()!.width;
  expect((await field.boundingBox())!.width).toBeGreaterThan(width / 2);

  await field.fill('walk');
  await page.getByText('Morning walk').first().tap();
  await expect(page.getByRole('article').getByText('Morning walk')).toBeVisible();
  await expect(field).toHaveCount(0);

  // An empty search folds back from its back arrow.
  await openSearch(page, (target) => target.tap());
  await bar.getByRole('button', { name: 'Close search' }).tap();
  await expect(field).toHaveCount(0);
  await expect(icon).toHaveAttribute('aria-expanded', 'false');
});

test('back folds the unfolded search instead of leaving the app', async ({ page }) => {
  await importPlainIcs(page, DIARY_ICS);
  const icon = page.getByRole('banner').getByRole('button', { name: 'Search', exact: true });
  const field = await openSearch(page, (target) => target.tap());
  await field.fill('walk');
  await expect(page.getByText('Morning walk').first()).toBeVisible();

  await page.goBack();
  await expect(field).toHaveCount(0);
  await expect(icon).toHaveAttribute('aria-expanded', 'false');
  await expect(page).not.toHaveURL('about:blank');
});

test('title and subtitle scroll away with a long body while writing', async ({ page }) => {
  await startPlainDiary(page);
  await page.getByRole('button', { name: /^New entry$/ }).click();
  const title = page.getByPlaceholder('Title', { exact: true });
  await title.fill('A long day');
  const body = page.locator('.ProseMirror');
  await body.click();
  for (let i = 0; i < 40; i++) await page.keyboard.press('Enter');
  await page.keyboard.type('The last line');

  // Following the caret down scrolls the whole page, header fields included.
  await expect(body.getByText('The last line')).toBeInViewport();
  await expect(title).not.toBeInViewport();
});
