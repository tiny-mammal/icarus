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
  const counts = settings.getByRole('group', { name: 'Length count' });
  await counts.getByRole('button', { name: 'Words', exact: true }).click();
  await expect(settings.getByTestId('count-preview')).toHaveText('248 words');
  await settings.getByRole('button', { name: /Always/ }).click();
  await settings.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: 'New entry', exact: true }).click();
  const count = page.getByTestId('entry-count');
  await page.locator('.ProseMirror').click();
  await page.keyboard.type('Dear diary');
  await expect(count).toHaveText('2 words');
  await expect(count).toHaveCSS('opacity', '1');

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Settings' }).click();
  await counts.getByRole('button', { name: 'Off', exact: true }).click();
  await expect(settings.getByRole('button', { name: /Always/ })).toBeDisabled();
});
