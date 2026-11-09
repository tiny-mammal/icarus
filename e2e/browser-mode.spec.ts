import { expect, test, type Page } from '@playwright/test';
import { importPlainIcs, startPlainDiary, openSearch } from './helpers';

/**
 * End-to-end coverage for the browser storage backend: the app must detect the
 * browser, keep the diary in IndexedDB, survive reloads, and stay functional on
 * insecure origins (plain HTTP on a LAN address), where secure-context APIs
 * such as `crypto.randomUUID` do not exist.
 */

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1']);

const IMPORTED_ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//icarus//EN',
  'BEGIN:VEVENT',
  'UID:imported@icarus.diary',
  'DTSTART;VALUE=DATE:20260608',
  'SUMMARY:Imported entry',
  'DESCRIPTION:From an imported file',
  'END:VEVENT',
  'END:VCALENDAR',
  '',
].join('\r\n');


async function startWriting(page: Page): Promise<void> {
  await page.getByRole('button', { name: /New entry|Continue draft/ }).click();
}

async function writeEntry(page: Page, title: string, body: string): Promise<void> {
  await startWriting(page);
  await page.getByPlaceholder('Title', { exact: true }).fill(title);
  await page.locator('.ProseMirror').fill(body);
  await page.getByRole('button', { name: 'Save entry' }).click();
  // Saving returns to the calendar; the entry is there on its day.
  await expect(page.getByRole('complementary')).toBeHidden();
  await openToday(page);
  await expect(page.getByRole('article').getByText(title)).toBeVisible();
}

async function openToday(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Today', exact: true }).click();
}

test('detects browser mode and reports the origin context', async ({ page, baseURL }) => {
  await page.goto('/');
  // The browser-only copy proves the app selected the web storage backend.
  await expect(page.getByText('Import a diary (.ics)')).toBeVisible();

  const context = await page.evaluate(() => ({
    secure: isSecureContext,
    randomUUID: typeof crypto.randomUUID,
  }));

  const hostname = new URL(baseURL!).hostname;
  if (!LOOPBACK.has(hostname)) {
    // A plain-HTTP LAN origin is insecure: this is the condition that used to
    // crash the editor on `crypto.randomUUID()`.
    expect(context.secure).toBe(false);
    expect(context.randomUUID).toBe('undefined');
  }
});

test('creates, persists and edits an entry in IndexedDB', async ({ page }) => {
  await startPlainDiary(page);
  await writeEntry(page, 'Browser smoke test', 'Written in the browser backend.');

  // The vault must come back from IndexedDB, not from memory.
  await page.reload();
  await openToday(page);
  await expect(page.getByRole('article').getByText('Browser smoke test')).toBeVisible();

  // Editing exercises id generation on this origin.
  await page.getByRole('button', { name: 'Edit entry' }).click();
  await page.locator('.ProseMirror').fill('Edited in the browser.');
  await page.getByRole('button', { name: 'Save entry' }).click();
  await expect(page.getByRole('complementary')).toBeHidden();
  await openToday(page);
  await expect(
    page.getByRole('article').getByText('Edited in the browser.'),
  ).toBeVisible();

  // And the revision is durable too.
  await page.reload();
  await openToday(page);
  await expect(
    page.getByRole('article').getByText('Edited in the browser.'),
  ).toBeVisible();
});

test('restores an autosaved draft after a reload', async ({ page }) => {
  await startPlainDiary(page);
  await startWriting(page);
  await page.getByPlaceholder('Title', { exact: true }).fill('Half-written');
  await page.locator('.ProseMirror').fill('Draft body');
  await expect(page.getByTestId('entry-status')).toContainText('Draft saved');
  await page.getByRole('button', { name: 'Minimize' }).click();

  await page.reload();
  // It waits in the strip, and in the drafts list.
  await expect(page.getByRole('button', { name: /^Continue writing/ })).toContainText('Half-written');
  await page.getByRole('button', { name: /Drafts/ }).click();
  const drafts = page.getByRole('dialog', { name: 'Saved drafts' });
  await expect(drafts.getByText('Half-written')).toBeVisible();
  await drafts.getByRole('button', { name: /Half-written/ }).click();
  await expect(page.getByPlaceholder('Title', { exact: true })).toHaveValue('Half-written');
});

test('a minimized draft waits in a strip while reading', async ({ page }) => {
  await startPlainDiary(page);
  await writeEntry(page, 'Read me', 'Already saved.');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('complementary')).toBeHidden();

  await startWriting(page);
  await page.getByPlaceholder('Title', { exact: true }).fill('Half-written');
  await page.getByRole('button', { name: 'Minimize' }).click();
  const strip = page.getByRole('button', { name: /^Continue writing/ });
  await expect(strip).toContainText('Half-written');

  // It stays while reading another entry, and reopens the work where it was.
  await openToday(page);
  await expect(page.getByRole('article').getByText('Read me')).toBeVisible();
  await expect(strip).toBeVisible();
  await strip.click();
  await expect(page.getByPlaceholder('Title', { exact: true })).toHaveValue('Half-written');
  await expect(strip).toBeHidden();

  // Saving finishes the work, so nothing is left waiting.
  await page.getByRole('button', { name: 'Save entry' }).click();
  await expect(page.getByRole('complementary')).toBeHidden();
  await expect(strip).toBeHidden();
});

test('a minimized edit is flagged on the entry it changes', async ({ page }) => {
  await startPlainDiary(page);
  await writeEntry(page, 'Read me', 'Already saved.');
  await page.getByRole('button', { name: 'Edit entry' }).click();
  await page.locator('.ProseMirror').fill('Rewritten.');
  await page.getByRole('button', { name: 'Minimize' }).click();

  // It leaves the old text behind, then flags it when the entry is read.
  await expect(page.getByRole('complementary')).toBeHidden();
  await expect(page.getByRole('button', { name: /^Continue writing/ })).toContainText('Editing entry');
  await openToday(page);
  const notice = page.getByRole('status').filter({ hasText: 'Unsaved changes to this entry' });
  await expect(notice).toBeVisible();
  await expect(page.getByRole('article')).toContainText('Already saved.');
  await notice.getByRole('button', { name: 'Continue editing' }).click();
  await expect(page.locator('.ProseMirror')).toHaveText('Rewritten.');

  await page.getByRole('button', { name: 'Save entry' }).click();
  await openToday(page);
  await expect(page.getByRole('article')).toContainText('Rewritten.');
  await expect(notice).toBeHidden();
});

test('the top bar leaves writing actions to the open editor', async ({ page }) => {
  await startPlainDiary(page);
  await startWriting(page);
  await page.getByPlaceholder('Title', { exact: true }).fill('Parked');
  await page.getByRole('button', { name: 'Minimize' }).click();

  const banner = page.getByRole('banner');
  const search = page.getByRole('textbox', { name: 'Search entries' });
  await expect(banner.getByRole('button', { name: 'Drafts', exact: true })).toBeVisible();
  const searchBefore = await search.boundingBox();

  // While writing, only the editor offers drafts; the search stays put.
  await startWriting(page);
  await expect(page.getByRole('form', { name: 'New entry' }).getByRole('button', { name: 'Drafts', exact: true })).toBeVisible();
  await expect(banner.getByRole('button', { name: 'Drafts', exact: true })).toHaveCount(0);
  await expect(banner.getByRole('button', { name: /^(New entry|Continue draft)$/ })).toHaveCount(0);
  expect((await search.boundingBox())?.x).toBe(searchBefore?.x);
});

test('the top bar actions never overlap the search on mid-size screens', async ({ page }) => {
  await startPlainDiary(page);
  await startWriting(page);
  await page.getByPlaceholder('Title', { exact: true }).fill('Parked');
  await page.getByRole('button', { name: 'Minimize' }).click();

  const banner = page.getByRole('banner');
  // The search field's box, not the bare input inside it.
  const field = banner.locator('div:has(> input[aria-label="Search entries"])');
  const drafts = banner.getByRole('button', { name: 'Drafts', exact: true });
  for (const width of [640, 768, 820, 900, 1024]) {
    await page.setViewportSize({ width, height: 800 });
    const fieldBox = (await field.boundingBox())!;
    const draftsBox = (await drafts.boundingBox())!;
    expect(fieldBox.x + fieldBox.width, `at ${width}px`).toBeLessThanOrEqual(draftsBox.x);
  }
});

test('imports an .ics file into browser storage', async ({ page }) => {
  await importPlainIcs(page, IMPORTED_ICS, 'imported.ics');

  await (await openSearch(page)).fill('Imported entry');
  await expect(page.getByText('Imported entry').first()).toBeVisible();

  // The import was copied into the browser vault, so it survives a reload.
  await page.reload();
  await (await openSearch(page)).fill('Imported entry');
  await expect(page.getByText('Imported entry').first()).toBeVisible();
});

test('exports a downloadable .ics backup', async ({ page }) => {
  // Headless Chromium cannot show a native save picker; force the download
  // fallback (also what browsers without the File System Access API get).
  await page.addInitScript(() => {
    delete (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker;
  });
  await startPlainDiary(page);
  await page.getByRole('button', { name: 'Settings' }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export backup/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('icarus-diary-backup.ics');
  await expect(page.getByText('Backup exported.')).toBeVisible();
});

test('deletes the browser diary after explicit confirmation', async ({ page }) => {
  await startPlainDiary(page);
  await writeEntry(page, 'Doomed entry', 'Temporary.');

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByText('This browser', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Delete diary/ }).click();
  await expect(page.getByRole('heading', { name: 'Delete this diary?' })).toBeVisible();
  await page
    .getByRole('dialog')
    .filter({ hasText: 'Delete this diary?' })
    .getByRole('button', { name: 'Delete diary' })
    .click();

  await expect(page.getByText('Import a diary (.ics)')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Import a diary (.ics)')).toBeVisible();
});
