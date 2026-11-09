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
