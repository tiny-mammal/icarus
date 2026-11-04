import { execFileSync } from 'node:child_process';
import { _android as android, expect, test, type AndroidDevice, type AndroidWebView, type Page } from '@playwright/test';

/**
 * Smoke test for the Android app, run by `.github/workflows/release.yml` on an
 * emulator with a debug APK installed. Playwright drives the real app through
 * the WebView's DevTools socket (debug builds expose it) with its Android
 * support, so this covers the device storage backend, the app's private
 * files and a cold restart.
 *
 * Locally: boot an emulator, `adb install` a debug APK, then
 * `pnpm exec playwright test --config playwright.android.config.ts`.
 */

const APP_ID = 'com.icarus.diary';

function adb(...args: string[]): string {
  return execFileSync('adb', args, { encoding: 'utf8' }).trim();
}

let device: AndroidDevice;

test.beforeAll(async () => {
  [device] = await android.devices();
  if (!device) throw new Error('No Android device or emulator is connected');
});

/** Cold-start the app and return the page of its new process's WebView. */
async function launchApp(): Promise<Page> {
  adb('shell', 'am', 'force-stop', APP_ID);
  adb('shell', 'am', 'start', '-W', '-n', `${APP_ID}/.MainActivity`);
  let pid = 0;
  await expect.poll(() => (pid = Number(adb('shell', 'pidof', APP_ID)) || 0), { timeout: 30_000 }).toBeGreaterThan(0);
  // The previous process's WebView can linger in Playwright's list for a
  // moment after force-stop, so wait for the one that belongs to this pid.
  let webview: AndroidWebView | undefined;
  await expect
    .poll(() => (webview = device.webViews().find((view) => view.pkg() === APP_ID && view.pid() === pid)), {
      timeout: 60_000,
    })
    .toBeTruthy();
  const page = await webview!.page();
  await page.waitForLoadState('domcontentloaded');
  return page;
}

async function screenshot(name: string): Promise<void> {
  const png = execFileSync('adb', ['exec-out', 'screencap', '-p']);
  await test.info().attach(name, { body: png, contentType: 'image/png' });
}

function privateFiles(): string[] {
  return adb('shell', 'run-as', APP_ID, 'find', '.', '-type', 'f', '-name', '*.vault', '-o', '-type', 'f', '-name', '*.json')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

test.describe.configure({ mode: 'serial' });

test.afterAll(async () => {
  await device?.close();
});

test('starts on the welcome screen with the device storage backend', async () => {
  adb('shell', 'pm', 'clear', APP_ID);
  const page = await launchApp();

  await expect(page.getByRole('button', { name: 'Start a new diary' })).toBeVisible({ timeout: 30_000 });
  // Folder copy would mean the desktop backend was picked.
  await expect(page.getByText('Choose where your diary')).toHaveCount(0);

  const context = await page.evaluate(() => ({
    secure: isSecureContext,
    subtle: typeof crypto.subtle?.importKey,
  }));
  // Password protection needs Web Crypto, which needs a secure context.
  expect(context).toEqual({ secure: true, subtle: 'function' });
  await screenshot('welcome');
});

test('keeps a new diary in the app\'s private storage across a restart', async () => {
  let page = await launchApp();
  await page.getByRole('button', { name: 'Start a new diary' }).click();
  await page.getByText("Don't encrypt", { exact: true }).click();
  await page.getByRole('button', { name: 'Create without password' }).click();

  await page.getByRole('button', { name: /^(New entry|Continue draft)$/ }).first().click();
  await page.getByPlaceholder('Title', { exact: true }).fill('Written on Android');
  await page.locator('.ProseMirror').fill('Saved in the app’s private storage.');
  await page.getByRole('button', { name: 'Save entry' }).click();
  await expect(page.getByRole('complementary')).toBeHidden();
  await screenshot('entry-saved');

  expect(privateFiles().some((file) => file.endsWith('/diary.vault'))).toBe(true);

  page = await launchApp();
  // A remembered diary skips the welcome screen.
  await expect(page.getByRole('button', { name: /^(New entry|Continue draft)$/ }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Written on Android').first()).toBeAttached();
  await screenshot('after-restart');
});
