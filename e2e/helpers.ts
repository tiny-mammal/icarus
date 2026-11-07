import { expect, type Locator, type Page } from '@playwright/test';
import { Buffer } from 'node:buffer';

/** Shared onboarding steps for the browser-mode E2E suites. */

/** Pick "Don't encrypt" in the protection choice and confirm with `action`. */
export async function chooseNoPassword(page: Page, action: string): Promise<void> {
  await page.getByText("Don't encrypt", { exact: true }).click();
  await page.getByRole('button', { name: action }).click();
}

/** Onboard with a fresh, unencrypted browser diary. */
export async function startPlainDiary(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start a new diary' }).click();
  await chooseNoPassword(page, 'Create without password');
  await expect(page.getByRole('button', { name: /^New entry$/ })).toBeVisible();
}

/** Pick an `.ics` from the Welcome screen; the protection choice opens next. */
export async function pickIcs(page: Page, ics: string, name = 'diary.ics'): Promise<void> {
  await page.goto('/');
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import a diary/ }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name, mimeType: 'text/calendar', buffer: Buffer.from(ics) });
}

/** Import an `.ics` from the Welcome screen as an unencrypted diary. */
export async function importPlainIcs(page: Page, ics: string, name?: string): Promise<void> {
  await pickIcs(page, ics, name);
  await chooseNoPassword(page, 'Import without password');
  await expect(page.getByRole('button', { name: 'Statistics' })).toBeVisible();
}

/**
 * The search field. Phones fold it into an icon in the top bar, so it is
 * unfolded first there (with `press`, to tap on touch devices).
 */
export async function openSearch(
  page: Page,
  press: (target: Locator) => Promise<void> = (target) => target.click(),
): Promise<Locator> {
  const field = page.getByRole('textbox', { name: 'Search entries' });
  const icon = page.getByRole('banner').getByRole('button', { name: 'Search', exact: true });
  if (await icon.isVisible()) await press(icon);
  else await press(field);
  await expect(field).toBeFocused();
  return field;
}

/**
 * A row of the search results. They show a moment after the query is typed,
 * so a bare text lookup could settle on the same words elsewhere on the page.
 */
export function searchResult(page: Page, text: string): Locator {
  return page.getByRole('banner').getByRole('listitem').filter({ hasText: text }).first();
}

/**
 * Hide notifications for the rest of the test. They sit above everything on
 * purpose, so they can cover what a test points at or checks is on top.
 */
export async function hideToasts(page: Page): Promise<void> {
  await page.addStyleTag({ content: '[aria-label="Notifications"] { display: none; }' });
}
