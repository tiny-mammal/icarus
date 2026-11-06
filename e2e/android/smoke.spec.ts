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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Every DevTools connection opened to the app. Playwright doesn't handle
 * errors on its adb sockets, so writing to one whose app was killed throws an
 * uncaught `EPIPE` that fails the test: close them all before killing the app.
 */
const connections = new Set<Page>();

async function disconnectAll(): Promise<void> {
  // A late attach can land while others close, so repeat until none is left.
  while (connections.size > 0) {
    const pages = [...connections];
    connections.clear();
    await Promise.all(pages.map((page) => page.context().close().catch(() => {})));
  }
}

/** The page of `webview`, or null if it doesn't attach within `ms`. */
async function attach(webview: AndroidWebView, ms: number): Promise<Page | null> {
  // Track late attaches too, so the next restart closes them.
  const pending = webview.page().then(
    (page) => (connections.add(page), page),
    () => null,
  );
  const page = await Promise.race([pending, sleep(ms).then(() => null)]);
  return page && !page.isClosed() ? page : null;
}

/**
 * Cold-start the app and return the page of its new process's WebView.
 *
 * Right after a cold start (especially after `pm clear`), Playwright can list
 * a WebView whose page never attaches, or the previous process's WebView. So
 * keep retrying until the WebView of the running process yields a live page.
 */
async function launchApp(): Promise<Page> {
  await disconnectAll();
  adb('shell', 'am', 'force-stop', APP_ID);
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    // Relaunch while the app isn't in the foreground: a freshly booted
    // emulator can ignore a launch until its setup completes.
    const resumed = adb('shell', 'dumpsys', 'activity', 'activities')
      .split('\n')
      .some((line) => line.includes('ResumedActivity') && line.includes(APP_ID));
    if (!resumed) adb('shell', 'am', 'start', '-W', '-n', `${APP_ID}/.MainActivity`);
    const pid = Number(adb('shell', 'pidof', APP_ID)) || 0;
    const webview = device.webViews().find((view) => view.pkg() === APP_ID && view.pid() === pid);
    const page = pid && webview ? await attach(webview, 15_000) : null;
    if (page) {
      await page.waitForLoadState('domcontentloaded');
      return page;
    }
    await sleep(1_000);
  }
  throw new Error(`The ${APP_ID} WebView never attached`);
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
  await disconnectAll();
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
