import { expect, test, type Page } from '@playwright/test';
import { diaryIcs, importPlainIcs, openSearch } from './helpers';
import wheelFixture from '../tests/fixtures/wheel-windows-chrome.json' with { type: 'json' };

/**
 * The day pane's day stepper jumps between days that hold entries (skipping
 * empty ones and crossing months), while the entry pager stays within a day.
 */

const DIARY_ICS = diaryIcs([
  { date: '2025-12-31', title: 'New year eve' },
  { date: '2026-06-08', title: 'Morning walk' },
  { date: '2026-06-08', title: 'Evening swim' },
  { date: '2026-06-20', title: 'Midsummer' },
]);

async function importDiary(page: Page): Promise<void> {
  await importPlainIcs(page, DIARY_ICS);
}

async function openFromSearch(page: Page, title: string): Promise<void> {
  await (await openSearch(page)).fill(title);
  await page.getByText(title).first().click();
  await expect(page.getByRole('article').getByText(title)).toBeVisible();
}

const heading = (page: Page) => page.getByRole('complementary').getByRole('heading', { level: 2 });
const article = (page: Page) => page.getByRole('complementary').getByRole('article');

test('steps between days with entries and between entries of a day', async ({ page }) => {
  await importDiary(page);
  await openFromSearch(page, 'Midsummer');

  const prevDay = page.getByRole('button', { name: 'Previous day' });
  const nextDay = page.getByRole('button', { name: 'Next day' });

  // Last day: nothing later.
  await expect(nextDay).toBeDisabled();

  // Skips the empty days between 20 and 8 June, and opens on the first entry.
  await prevDay.click();
  await expect(heading(page)).toContainText('2026');
  await expect(article(page)).toContainText('Morning walk');
  await expect(page.getByText('1 / 2')).toBeVisible();
  await page.screenshot({ path: 'test-results/day-navigation-pane.png' });

  // The entry pager stays on the same day.
  await page.getByRole('button', { name: 'Next entry' }).click();
  await expect(article(page)).toContainText('Evening swim');

  // ←/→ turn the page: through the day's entries first, then on to the next
  // day, entering it from its last entry when going back.
  await page.keyboard.press('ArrowRight');
  await expect(article(page)).toContainText('Midsummer');
  await page.keyboard.press('ArrowLeft');
  await expect(article(page)).toContainText('Evening swim');
  await expect(page.getByText('2 / 2')).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(article(page)).toContainText('Morning walk');

  // ← crosses into the previous year and moves the calendar along with it.
  await page.keyboard.press('ArrowLeft');
  await expect(article(page)).toContainText('New year eve');
  await expect(prevDay).toBeDisabled();
  await expect(page.getByText('December 2025')).toBeVisible();
  await expect(page.getByText('1 / 2')).toBeHidden();

  await page.keyboard.press('ArrowRight');
  await expect(article(page)).toContainText('Morning walk');

  // E edits the entry being read in the same pane; Escape goes back to reading.
  const title = page.getByPlaceholder('Title', { exact: true });
  await page.keyboard.press('e');
  await expect(title).toHaveValue('Morning walk');
  await page.keyboard.press('Escape');
  await expect(article(page)).toContainText('Morning walk');

  // Tapping the text does the same, with the caret where it was tapped.
  await article(page).getByRole('heading', { name: 'Morning walk' }).click();
  await expect(title).toBeFocused();
  await page.keyboard.press('Escape');

  // Leaving an untouched entry doesn't leave a draft behind.
  await expect(page.getByRole('button', { name: /Drafts/ })).toHaveCount(0);

  // Wide screens can expand the pane to the whole window; F toggles it too.
  await page.getByRole('button', { name: 'Full screen' }).click();
  await expect(page.getByRole('button', { name: 'Exit full screen' })).toBeVisible();
  await page.waitForTimeout(350); // let the pane settle for the screenshot
  await page.screenshot({ path: 'test-results/day-navigation-expanded.png' });
  await page.keyboard.press('f');
  await expect(page.getByRole('button', { name: 'Full screen' })).toBeVisible();
  // Shift skips the rest of the day's entries.
  await page.keyboard.press('Shift+ArrowRight');
  await expect(article(page)).toContainText('Midsummer');
});

test('writes a new entry on the open day, including empty days', async ({ page }) => {
  await importDiary(page);
  await openFromSearch(page, 'Midsummer');

  // A day with entries offers "+" in the header to add another one.
  await page.waitForTimeout(350); // let the pane slide in for the screenshot
  await page.screenshot({ path: 'test-results/day-compose-header.png' });
  await page.getByRole('button', { name: 'New entry on this day' }).click();
  await expect(page.getByRole('button', { name: /^Sat, \D*20\b/ })).toBeVisible();
  await page.keyboard.press('Escape'); // back to reading
  await page.keyboard.press('Escape'); // close the day pane

  // An empty day offers the same action from its empty state.
  await page.getByRole('button', { name: /^Tuesday, June 16/ }).click();
  await expect(page.getByText('No entries on this day yet.')).toBeVisible();
  await page.waitForTimeout(350); // let the pane slide in for the screenshot
  await page.screenshot({ path: 'test-results/day-compose-empty.png' });
  await page.getByRole('button', { name: 'Write an entry for this day' }).click();
  await expect(page.getByRole('button', { name: /^Tue, \D*16\b/ })).toBeVisible();
  await page.waitForTimeout(350); // let the editor settle for the screenshot
  await page.screenshot({ path: 'test-results/day-compose-editor.png' });
});

test('narrow screens show the short day label so header actions fit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await importDiary(page);
  await openFromSearch(page, 'Midsummer');

  await expect(heading(page).getByText(/^(Jun 20|20 Jun), 2026$/)).toBeVisible();
  await expect(heading(page).getByText(/^Saturday/)).toBeHidden();
  await page.waitForTimeout(350); // let the pane slide in for the screenshot
  await page.screenshot({ path: 'test-results/day-pane-mobile.png' });
});

test('date format preference rewrites day labels and survives a reload', async ({ page }) => {
  await importDiary(page);
  await openFromSearch(page, 'Midsummer');

  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  const format = settings.getByRole('button', { name: /^Date format/ });
  await format.click();
  await settings.getByRole('option', { name: /Year first/ }).click();
  await expect(format).toHaveText('Year first');
  await page.waitForTimeout(250); // let the dialog transition settle for the screenshot
  await page.screenshot({ path: 'test-results/date-format-settings.png' });

  await settings.getByRole('button', { name: 'Close' }).click();
  await expect(settings).toBeHidden();
  await expect(heading(page)).toContainText('2026-06-20');
  await page.waitForTimeout(350); // let the backdrop fade out for the screenshot
  await page.screenshot({ path: 'test-results/date-format-iso.png' });

  // The choice is persisted with the other preferences.
  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: /^Date format/ })).toHaveText(
    'Year first',
  );
});

type WheelEvents = number[][]; // [t (ms), deltaX, deltaY]

/**
 * Dispatch wheel events at the element under (x, y) on their own schedule,
 * as a touchpad does (Playwright's mouse.wheel can't keep a steady 16ms beat).
 * Events that fall due while the page is busy are merged into one, as Chrome
 * does (lifts, which carry no delta, stay separate).
 */
async function playWheel(page: Page, x: number, y: number, events: WheelEvents): Promise<void> {
  await page.evaluate(
    async ({ x, y, events }) => {
      const fire = (deltaX: number, deltaY: number) =>
        // Like a real wheel, aimed at whatever is under the pointer right now.
        document
          .elementFromPoint(x, y)!
          .dispatchEvent(new WheelEvent('wheel', { deltaX, deltaY, bubbles: true, cancelable: true }));
      const start = performance.now();
      let i = 0;
      while (i < events.length) {
        const wait = start + events[i][0] - performance.now();
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        let [, deltaX, deltaY] = events[i++];
        const lift = deltaX === 0 && deltaY === 0;
        while (!lift && i < events.length && start + events[i][0] <= performance.now()) {
          const [, dx, dy] = events[i];
          if (dx === 0 && dy === 0) break;
          deltaX += dx;
          deltaY += dy;
          i++;
        }
        fire(deltaX, deltaY);
      }
    },
    { x, y, events },
  );
  await page.waitForTimeout(500); // the pause that ends it, plus the settle
}

/**
 * A touchpad swipe as Chrome on Windows sends it (see
 * tests/fixtures/wheel-windows-chrome.json): the fingers' deltas, an empty
 * event when they lift, then a long momentum tail. Positive deltaX is "next".
 */
function touchpadSwipe(fingers: number, { lift = true, momentum = 40 } = {}): WheelEvents {
  const deltas: number[][] = [];
  for (let i = 0; i < 6; i++) deltas.push([fingers / 6, 0]);
  if (lift) deltas.push([0, 0]);
  const sign = Math.sign(fingers);
  for (let i = 0; i < momentum; i++) deltas.push([sign * Math.max(1, Math.round(90 * 0.93 ** i)), 0]);
  return deltas.map(([dx, dy], i) => [i * 16, dx, dy]);
}

test('two-finger touchpad swipes page through months and days', async ({ page }) => {
  await importDiary(page);
  await openFromSearch(page, 'Midsummer');
  await page.keyboard.press('Escape'); // back to the calendar on June 2026
  await expect(page.getByText('June 2026')).toBeVisible();

  const box = (await page.getByRole('button', { name: /^Tuesday, June 16/ }).boundingBox())!;
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  const width = page.viewportSize()!.width;

  // The month follows the fingers and turns once they lift; the long
  // momentum after it doesn't carry on through more months.
  await playWheel(page, x, y, touchpadSwipe(width * 0.5));
  await expect(page.getByText('July 2026')).toBeVisible();
  // A short, slow nudge springs back.
  await playWheel(page, x, y, touchpadSwipe(12, { momentum: 0 }));
  await expect(page.getByText('July 2026')).toBeVisible();
  // Without a marked lift (other platforms), a pause ends the swipe.
  await playWheel(page, x, y, touchpadSwipe(-width * 0.5, { lift: false, momentum: 0 }));
  await expect(page.getByText('June 2026')).toBeVisible();

  // Six swipes in a row recorded on a real touchpad, each starting during
  // the last one's momentum: six months back.
  await playWheel(page, x, y, wheelFixture.gestures.find((g) => g.label === 'repeated swipes')!.events);
  await expect(page.getByText('December 2025')).toBeVisible();

  // Vertical scrolling never turns a page.
  await page.mouse.move(x, y);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(250);
  await expect(page.getByText('December 2025')).toBeVisible();

  // In the day pane the same swipe turns the page: back onto the previous
  // day's last entry, then through that day's entries.
  await openFromSearch(page, 'Midsummer');
  await page.waitForTimeout(350); // let the pane slide in
  const body = (await article(page).boundingBox())!;
  await playWheel(page, body.x + body.width / 2, body.y + 20, touchpadSwipe(-200));
  await expect(article(page)).toContainText('Evening swim');
  await playWheel(page, body.x + body.width / 2, body.y + 20, touchpadSwipe(-200));
  await expect(article(page)).toContainText('Morning walk');
  await playWheel(page, body.x + body.width / 2, body.y + 20, touchpadSwipe(200));
  await expect(article(page)).toContainText('Evening swim');
  await playWheel(page, body.x + body.width / 2, body.y + 20, touchpadSwipe(200));
  await expect(article(page)).toContainText('Midsummer');
});
