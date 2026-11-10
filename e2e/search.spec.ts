import { expect, test } from '@playwright/test';
import { dateKey } from '../src/lib/date';
import { diaryIcs, importPlainIcs, openSearch } from './helpers';

/** A diary where every entry matches, so the results come in batches. */
function manyMatchesIcs(count: number): string {
  return diaryIcs(
    Array.from({ length: count }, (_, i) => ({
      date: dateKey(new Date(2020, 0, 1 + i)),
      title: `Evening walk ${i}`,
    })),
  );
}

test('scrolling through many results loads more without jumping back up', async ({ page }) => {
  await importPlainIcs(page, manyMatchesIcs(300));
  const field = await openSearch(page);
  await field.fill('walk');

  const list = page.getByRole('list').filter({ hasText: 'Evening walk' });
  await expect(list.getByText(/Showing 50 of 300 results/)).toBeVisible();

  // Scroll to the end of the first batch: the next one loads under it.
  const scrolled = await list.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
    return el.scrollTop;
  });
  expect(scrolled).toBeGreaterThan(100);
  await expect(list.getByText(/Showing 100 of 300 results/)).toBeVisible();

  // Give any stray "keep the active row in view" a few frames to misfire.
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
  expect(await list.evaluate((el) => el.scrollTop)).toBeGreaterThanOrEqual(scrolled - 1);

  // A new query starts from the top again.
  await field.fill('evening walk');
  await expect(list.getByText(/Showing 50 of 300 results/)).toBeVisible();
  await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBeLessThan(10);
});

test('results can be listed oldest first, and go back to newest once left', async ({ page }) => {
  await importPlainIcs(page, manyMatchesIcs(3));
  const field = await openSearch(page);
  await field.fill('walk');

  const titles = page.getByRole('banner').getByRole('listitem');
  await expect(titles.first()).toContainText('Evening walk 2');
  await page.getByRole('button', { name: 'Newest first, show oldest first' }).click();
  await expect(titles.first()).toContainText('Evening walk 0');
  await expect(field).toBeFocused();

  // Enter opens the active (now oldest) row.
  await field.press('Enter');
  await expect(page.getByRole('complementary').getByRole('article')).toContainText('Evening walk 0');

  await (await openSearch(page)).fill('walk');
  await expect(titles.first()).toContainText('Evening walk 2');
});
