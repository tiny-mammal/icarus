import { expect, test } from '@playwright/test';
import { importPlainIcs, openSearch } from './helpers';

/** A diary where every entry matches, so the results come in batches. */
function manyMatchesIcs(count: number): string {
  const events = Array.from({ length: count }, (_, i) => {
    const day = new Date(Date.UTC(2020, 0, 1 + i)).toISOString().slice(0, 10).replace(/-/g, '');
    return [
      'BEGIN:VEVENT',
      `UID:walk-${i}@icarus.diary`,
      `DTSTART;VALUE=DATE:${day}`,
      `SUMMARY:Evening walk ${i}`,
      'END:VEVENT',
    ];
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//icarus//EN', ...events.flat(), 'END:VCALENDAR', '']
    .join('\r\n');
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
