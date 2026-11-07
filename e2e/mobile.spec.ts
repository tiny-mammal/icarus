import { devices, expect, test, type CDPSession, type Page } from '@playwright/test';
import { importPlainIcs, openSearch, startPlainDiary } from './helpers';

/**
 * Phone layout: the month's entries listed under a compact calendar, swipes
 * that page through months and days, and bottom sheets that close on a
 * pull-down. Touches go through CDP so they are real touch events.
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

const monthButton = (page: Page) => page.locator('button[aria-haspopup="dialog"]').filter({ hasText: /\d{4}/ });

test('lists the month, swipes between months and days, and pulls sheets down', async ({ page, context }) => {
  await importPlainIcs(page, DIARY_ICS);
  const cdp = await context.newCDPSession(page);

  // Bring June 2026 into view through the month picker.
  await monthButton(page).click();
  const picker = page.getByRole('dialog', { name: 'Select month and year' });
  while (!(await picker.getByText('2026', { exact: true }).isVisible())) {
    const year = Number(await picker.locator('span.tabular-nums').innerText());
    await picker.getByRole('button', { name: year > 2026 ? 'Previous year' : 'Next year' }).click();
  }
  await picker.getByRole('button', { name: 'Jun' }).click();
  await expect(monthButton(page)).toContainText('June 2026');

  // The month's entries are listed under the grid.
  const listed = page
    .getByRole('region', { name: 'Entries this month' })
    .getByRole('button', { name: /Morning walk$/ });
  await expect(listed).toBeVisible();
  await expect(listed).toContainText('Lisbon');

  // Swipe left for the next month, right to come back.
  await drag(cdp, [340, 300], [60, 310]);
  await expect(monthButton(page)).toContainText('July 2026');
  await drag(cdp, [60, 300], [340, 310]);
  await expect(monthButton(page)).toContainText('June 2026');

  // Opening an entry from the list, then swiping to the next day with entries.
  await listed.click();
  const pane = page.getByRole('complementary');
  await expect(pane.getByRole('article')).toContainText('Morning walk');
  // Let the pane finish sliding in before swiping across it.
  await pane.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  await drag(cdp, [340, 500], [60, 510]);
  await expect(pane.getByRole('article')).toContainText('Midsummer');
  await pane.getByRole('button', { name: 'Close' }).click();

  // Settings opens as a bottom sheet that closes when pulled down.
  await page.getByRole('button', { name: 'Settings' }).click();
  const sheet = page.getByRole('dialog', { name: 'Settings' });
  await expect(sheet).toBeVisible();
  await sheet.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const box = (await sheet.boundingBox())!;
  await drag(cdp, [200, box.y + 16], [200, box.y + 260], 320);
  await expect(sheet).toBeHidden();
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
