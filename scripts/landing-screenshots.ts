/**
 * Capture the app screenshots used by the landing pages (`site/public/shots/`).
 * Imports the sample diary from `site/sample-diary.ts` into the browser
 * build, pins the clock to its "today", and photographs each screen at 2x.
 *
 *   pnpm exec vite --host 127.0.0.1 --port 1431 --strictPort &
 *   node scripts/landing-screenshots.ts [base-url]
 *
 * Needs `ffmpeg` (with libwebp) on PATH. localhost is a secure context, so password
 * protection (and the lock screen) works there.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from '@playwright/test';
import { TODAY, sampleDiaryIcs } from '../site/sample-diary.ts';

const BASE = process.argv[2] ?? 'http://127.0.0.1:1431';
const OUT = new URL('../site/public/shots/', import.meta.url).pathname;
const TMP = mkdtempSync(join(tmpdir(), 'icarus-shots-'));
const PASSWORD = 'a quiet harbour at dawn';

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

async function open(browser: Browser, viewport: { width: number; height: number }, mobile = false): Promise<Page> {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: mobile ? 3 : 2,
    isMobile: mobile,
    hasTouch: mobile,
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date(`${TODAY}T10:30:00`));
  return page;
}

/** Import the sample diary, optionally behind a password. */
async function importDiary(page: Page, password?: string): Promise<void> {
  await page.goto(BASE + '/');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import a diary/ }).click();
  await (await chooser).setFiles({
    name: 'diary.ics',
    mimeType: 'text/calendar',
    buffer: Buffer.from(sampleDiaryIcs()),
  });
  if (password) {
    await page.getByText('Encrypt with a password', { exact: true }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Repeat password').fill(password);
    await page.getByRole('button', { name: 'Continue' }).click();
    const key = (await page.getByTestId('recovery-key').getAttribute('data-key')) ?? '';
    await page.getByLabel(/last four characters/).fill(key.replace(/[^A-Za-z0-9]/g, '').slice(-4));
    await page.getByRole('button', { name: 'Import encrypted' }).click();
    await page.getByRole('button', { name: 'Open diary' }).click();
  } else {
    await page.getByText("Don't encrypt", { exact: true }).click();
    await page.getByRole('button', { name: 'Import without password' }).click();
  }
  await page.getByPlaceholder('Search entries…').waitFor();
  await settle(page);
}

async function settle(page: Page, ms = 500): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

async function shot(page: Page, name: string): Promise<void> {
  // Park the pointer in a corner so no hover state shows up in the picture.
  await page.mouse.move(1, page.viewportSize()!.height - 1);
  await page.waitForTimeout(250);
  const png = join(TMP, `${name}.png`);
  await page.screenshot({ path: png });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-c:v', 'libwebp', '-quality', '82', '-compression_level', '6', join(OUT, `${name}.webp`)]);
  console.log(`shots/${name}.webp`);
}

async function openDay(page: Page, day: number): Promise<void> {
  await page.locator(`[data-daykey="2026-10-${String(day).padStart(2, '0')}"]`).click();
  await settle(page);
}

const browser = await chromium.launch();
mkdirSync(OUT, { recursive: true });
try {
  // Welcome screen, before any diary exists.
  {
    const page = await open(browser, DESKTOP);
    await page.goto(BASE + '/');
    await page.getByRole('button', { name: /Import a diary/ }).waitFor();
    await settle(page);
    await shot(page, 'welcome');
    await page.context().close();
  }

  // Desktop: calendar, reader, editor, search, statistics.
  {
    const page = await open(browser, DESKTOP);
    await importDiary(page);
    await shot(page, 'calendar');

    await openDay(page, 24);
    await shot(page, 'reader');

    await page.getByRole('button', { name: 'Edit entry' }).click();
    await settle(page, 800);
    await shot(page, 'editor');
    await page.keyboard.press('Escape');
    await settle(page);
    await page.keyboard.press('Escape');
    await settle(page);

    await page.getByPlaceholder('Search entries…').fill('Ana');
    await settle(page, 600);
    await shot(page, 'search');
    await page.keyboard.press('Escape');
    await settle(page);

    await page.getByRole('button', { name: 'Statistics' }).click();
    await settle(page, 900);
    await shot(page, 'stats');
    await page.context().close();
  }

  // Phone: calendar and reader.
  {
    const page = await open(browser, PHONE, true);
    await importDiary(page);
    await shot(page, 'phone-calendar');
    await openDay(page, 24);
    await shot(page, 'phone-reader');
    await page.context().close();
  }

  // Lock screen of a password-protected diary.
  {
    const page = await open(browser, DESKTOP);
    await importDiary(page, PASSWORD);
    await page.getByRole('button', { name: 'Lock diary' }).click();
    await settle(page, 700);
    await shot(page, 'lock');
    await page.context().close();
  }
} finally {
  await browser.close();
  rmSync(TMP, { recursive: true, force: true });
}
