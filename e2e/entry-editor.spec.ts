import { expect, test } from '@playwright/test';
import { startPlainDiary } from './helpers';

test('the length count steps aside while typing and returns after a pause', async ({ page }) => {
  await startPlainDiary(page);
  await page.getByRole('button', { name: 'New entry', exact: true }).click();
  const count = page.getByTestId('entry-count');
  await expect(count).toHaveCSS('opacity', '1');

  await page.locator('.ProseMirror').click();
  await page.keyboard.type('Dear diary');
  await expect(count).toHaveCSS('opacity', '0');
  await expect(count).toHaveCSS('opacity', '1');
  await expect(count).toContainText('2 words · 10 chars');

  // Keys ProseMirror handles itself fire no input event, and still count as typing.
  await page.keyboard.press('Backspace');
  await expect(count).toHaveCSS('opacity', '0');
  await expect(count).toHaveCSS('opacity', '1');
  await expect(count).toContainText('2 words · 9 chars');
});

test('the reader shows the same length as the editor under the date', async ({ page }) => {
  await startPlainDiary(page);
  await page.getByRole('button', { name: 'New entry', exact: true }).click();
  await page.locator('.ProseMirror').click();
  await page.keyboard.type('Dear **diary**');
  await expect(page.getByTestId('entry-count')).toContainText('2 words · 10 chars');

  await page.getByRole('button', { name: 'Save entry' }).click();
  await page.getByRole('button', { name: /1 entry/ }).first().click();
  await expect(page.getByTestId('entry-length')).toHaveText('2 words · 10 chars');
});

test('undo and redo buttons appear once writing starts and step through the body history', async ({ page }) => {
  await startPlainDiary(page);
  await page.getByRole('button', { name: 'New entry', exact: true }).click();
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const redo = page.getByRole('button', { name: 'Redo', exact: true });
  const body = page.locator('.ProseMirror');
  await expect(undo).toBeHidden();
  await expect(redo).toBeHidden();

  await body.click();
  await page.keyboard.type('Dear diary');
  await expect(undo).toBeEnabled();
  await expect(redo).toBeDisabled();

  await undo.click();
  await expect(body).not.toContainText('Dear diary');
  await expect(body).toBeFocused();
  await expect(undo).toBeDisabled();
  await expect(redo).toBeEnabled();

  await redo.click();
  await expect(body).toContainText('Dear diary');
  await expect(redo).toBeDisabled();
});

test('the length count follows the chosen counts and can stay visible while typing', async ({ page }) => {
  await startPlainDiary(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  const counts = settings.getByRole('button', { name: /^Length count/ });
  const hides = settings.getByRole('switch', { name: 'Hide the count while typing' });
  await counts.click();
  await settings.getByRole('option', { name: 'Words' }).click();
  await expect(settings.getByText('Under the entry, like “248 words”')).toBeVisible();
  await hides.click();
  await settings.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: 'New entry', exact: true }).click();
  const count = page.getByTestId('entry-count');
  await page.locator('.ProseMirror').click();
  await page.keyboard.type('Dear diary');
  await expect(count).toHaveText('2 words');
  await expect(count).toHaveCSS('opacity', '1');

  // Without a count there is nothing to hide, nor anything in the footer.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Settings' }).click();
  await counts.click();
  await settings.getByRole('option', { name: 'Off' }).click();
  await expect(hides).toBeDisabled();
});

test('a select at the bottom of Settings opens upwards and Escape closes only its list', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 520 });
  await startPlainDiary(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  const format = settings.getByRole('button', { name: /^Date format/ });
  await format.scrollIntoViewIfNeeded();
  await format.focus();
  await page.keyboard.press('ArrowDown');
  const list = settings.getByRole('listbox', { name: 'Date format' });
  await expect(list).toBeInViewport({ ratio: 1 });

  await page.keyboard.press('Escape');
  await expect(list).toBeHidden();
  await expect(settings).toBeVisible();
  await expect(format).toBeFocused();
});
