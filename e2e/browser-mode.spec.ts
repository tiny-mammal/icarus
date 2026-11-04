import { expect, test, type Page } from '@playwright/test';
import { importPlainIcs, startPlainDiary } from './helpers';

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


async function openComposer(page: Page): Promise<void> {
  await page.getByRole('button', { name: /New entry|Continue draft/ }).click();
}

async function writeEntry(page: Page, title: string, body: string): Promise<void> {
  await openComposer(page);
  await page.getByPlaceholder('Title', { exact: true }).fill(title);
  await page.locator('.ProseMirror').fill(body);
  await page.getByRole('button', { name: /Commit entry/ }).click();
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
  await page.getByLabel('Edit entry').first().click();
  await page.locator('.ProseMirror').fill('Edited in the browser.');
  await page.getByRole('button', { name: /Save changes/ }).click();
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
  await openComposer(page);
  await page.getByPlaceholder('Title', { exact: true }).fill('Half-written');
  await page.locator('.ProseMirror').fill('Draft body');
  await page.getByRole('button', { name: 'Save as draft' }).click();
  await expect(page.getByText('Saved to drafts')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: /Drafts/ }).click();
  const drafts = page.getByRole('dialog', { name: 'Saved drafts' });
  await expect(drafts.getByText('Half-written')).toBeVisible();
  await drafts.getByRole('button', { name: /Half-written/ }).click();
  await expect(page.getByPlaceholder('Title', { exact: true })).toHaveValue('Half-written');
});

test('imports an .ics file into browser storage', async ({ page }) => {
  await importPlainIcs(page, IMPORTED_ICS, 'imported.ics');

  await page.getByPlaceholder('Search entries…').fill('Imported entry');
  await expect(page.getByText('Imported entry').first()).toBeVisible();

  // The import was copied into the browser vault, so it survives a reload.
  await page.reload();
  await page.getByPlaceholder('Search entries…').fill('Imported entry');
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
