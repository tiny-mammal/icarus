import { expect, test, type Page } from '@playwright/test';
import { pickIcs, startPlainDiary, openSearch } from './helpers';

/**
 * Password protection in browser mode. Web Crypto only exists in secure
 * contexts, so the full flows run on HTTPS/loopback origins (CI) and the
 * plain-HTTP LAN origin checks that the option is explained, not offered.
 */

const PASSWORD = 'correct horse battery staple';

const IMPORTED_ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//icarus//EN',
  'BEGIN:VEVENT',
  'UID:secret-import@icarus.diary',
  'DTSTART;VALUE=DATE:20260608',
  'SUMMARY:Imported confession',
  'DESCRIPTION:Only for me',
  'END:VEVENT',
  'END:VCALENDAR',
  '',
].join('\r\n');

async function isSecure(page: Page): Promise<boolean> {
  return page.evaluate(() => isSecureContext);
}

/** Everything the browser keeps for Icarus, as one string. */
async function storedData(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('icarus-diary');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const dump: unknown[] = [];
    for (const name of Array.from(db.objectStoreNames)) {
      dump.push(await new Promise((resolve) => {
        const request = db.transaction(name).objectStore(name).getAll();
        request.onsuccess = () => resolve(request.result);
      }));
    }
    db.close();
    return JSON.stringify(dump);
  });
}

/** Password and recovery-key steps; returns the recovery key. */
async function choosePassword(page: Page, finish: string): Promise<string> {
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Repeat password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();
  const recoveryKey = (await page.getByTestId('recovery-key').getAttribute('data-key'))!;
  await page.getByLabel(/type its last four characters/).fill(recoveryKey.slice(-4));
  await page.getByRole('button', { name: finish }).click();
  await expect(page.getByRole('heading', { name: 'Your diary is encrypted' })).toBeVisible();
  return recoveryKey;
}

async function writeEntry(page: Page, title: string): Promise<void> {
  await page.getByRole('button', { name: /^New entry$/ }).click();
  await page.getByPlaceholder('Title', { exact: true }).fill(title);
  await page.locator('.ProseMirror').fill('Nobody else should read this.');
  await page.getByRole('button', { name: 'Save entry' }).click();
  // Saving returns to the calendar, where the day now lists the entry.
  await expect(page.getByRole('complementary')).toBeHidden();
  await expect(page.getByRole('button', { name: new RegExp(`entry: ${title}$`) })).toBeVisible();
}

test('explains why protection is unavailable on insecure origins', async ({ page }) => {
  await page.goto('/');
  test.skip(await isSecure(page), 'Only meaningful on plain-HTTP origins');

  await page.getByRole('button', { name: 'Start a new diary' }).click();
  await expect(page.getByText(/Needs a secure connection/)).toBeVisible();
  await expect(page.getByRole('radio', { name: /Encrypt with a password/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Create without password' }).click();

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByText(/Password protection needs a secure connection/)).toBeVisible();
});

test('onboards an encrypted diary, locks, and unlocks', async ({ page }) => {
  await page.goto('/');
  test.skip(!(await isSecure(page)), 'Web Crypto needs a secure context');

  // Encryption is the preselected, recommended choice.
  await page.getByRole('button', { name: 'Start a new diary' }).click();
  await expect(page.getByText(/No password reset/)).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  const recoveryKey = await choosePassword(page, 'Create encrypted diary');
  await page.getByRole('button', { name: 'Open diary' }).click();
  await writeEntry(page, 'Encrypted e2e entry');

  // Nothing readable is left in IndexedDB.
  const atRest = await storedData(page);
  expect(atRest).not.toContain('Encrypted e2e entry');
  expect(atRest).not.toContain('Nobody else');

  // A reload starts locked; the wrong password is refused.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Diary locked' })).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill('not my password');
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByText('That password is not correct.')).toBeVisible();

  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Unlock' }).click();
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(page.getByRole('article').getByText('Encrypted e2e entry')).toBeVisible();

  // Lock from the top bar, then recover with the recovery key.
  await page.getByRole('button', { name: 'Lock diary' }).click();
  await expect(page.getByRole('heading', { name: 'Diary locked' })).toBeVisible();
  await page.getByRole('button', { name: /Use the recovery key/ }).click();
  await page.getByLabel('Recovery key').fill(recoveryKey);
  await page.getByLabel('New password', { exact: true }).fill('a whole new passphrase');
  await page.getByLabel('Repeat password').fill('a whole new passphrase');
  await page.getByRole('button', { name: 'Unlock and set new password' }).click();
  await expect(page.getByRole('button', { name: 'Lock diary' })).toBeVisible();

  await page.getByRole('button', { name: 'Lock diary' }).click();
  await page.getByLabel('Password', { exact: true }).fill('a whole new passphrase');
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByRole('button', { name: 'Lock diary' })).toBeVisible();
});

test('imports an .ics straight into an encrypted diary', async ({ page }) => {
  await page.goto('/');
  test.skip(!(await isSecure(page)), 'Web Crypto needs a secure context');

  await pickIcs(page, IMPORTED_ICS);
  await expect(page.getByRole('heading', { name: 'Protect the imported diary?' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await choosePassword(page, 'Import encrypted');
  await expect(page.getByText(/The .ics you imported is unchanged/)).toBeVisible();
  await page.getByRole('button', { name: 'Open diary' }).click();

  await (await openSearch(page)).fill('confession');
  await expect(page.getByText('Imported confession').first()).toBeVisible();
  expect(await storedData(page)).not.toContain('confession');
});

test('cancelling the protection choice writes nothing', async ({ page }) => {
  await pickIcs(page, IMPORTED_ICS);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Import a diary (.ics)')).toBeVisible();
  expect(await storedData(page)).not.toContain('confession');
});

test('a plain diary can be protected later from Settings', async ({ page }) => {
  await page.goto('/');
  test.skip(!(await isSecure(page)), 'Web Crypto needs a secure context');

  await startPlainDiary(page);
  await writeEntry(page, 'Protected later');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /Protect with a password/ }).click();
  await choosePassword(page, 'Encrypt diary');
  await page.getByRole('button', { name: 'Done' }).click();
  expect(await storedData(page)).not.toContain('Protected later');

  // Settings now offers the lock controls, and they work from there.
  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  const autoLock = settings.getByRole('button', { name: /^Lock after inactivity/ });
  await expect(autoLock).toHaveText('15 min');
  await autoLock.click();
  await settings.getByRole('option', { name: 'Never' }).click();
  await expect(autoLock).toHaveText('Never');
  await settings.getByRole('button', { name: /Lock now/ }).click();
  await expect(page.getByRole('heading', { name: 'Diary locked' })).toBeVisible();
});
