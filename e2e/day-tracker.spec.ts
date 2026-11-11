import { devices, expect, test, type Locator } from '@playwright/test';
import { diaryIcs, importPlainIcs, openDay, SAMPLE_ENTRY, SAMPLE_TRACKER, touchDrag } from './helpers';

/** Scoring a day and marking habits from the day's header, kept across reloads. */

test('scores a day, marks habits and keeps a streak set by hand', async ({ page }) => {
  await importPlainIcs(page, diaryIcs([SAMPLE_ENTRY]));
  await openDay(page, SAMPLE_ENTRY.date);

  const tracker = page.getByTestId('day-tracker');
  await expect(tracker).toContainText('Score the day');
  await page.keyboard.press('r');
  const panel = page.getByRole('dialog', { name: 'Score and habits' });
  await expect(panel).toBeVisible();

  await panel.getByRole('radio', { name: '7 of 10' }).click();
  await panel.getByRole('textbox', { name: 'New habit' }).fill('Morning run');
  await panel.getByRole('textbox', { name: 'New habit' }).press('Enter');
  await panel.getByRole('button', { name: /^Morning run: not marked/ }).click();
  await expect(panel.getByRole('button', { name: /^Streak for Morning run: 1 day/ })).toBeVisible();

  await panel.getByRole('button', { name: /^Streak for Morning run/ }).click();
  await panel.getByRole('textbox', { name: /^Streak for Morning run/ }).fill('40');
  await panel.getByRole('textbox', { name: /^Streak for Morning run/ }).press('Enter');
  await expect(panel.getByRole('button', { name: /^Streak for Morning run: 40 days, set by hand/ })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(tracker).toHaveAccessibleName(/Score 7 of 10, 1 of 1 habits done/);

  // Each tap saves in the background: reload only once the last one has landed.
  await expect(page.getByRole('progressbar', { name: 'Working' })).toHaveCount(0);
  await page.reload();
  await openDay(page, SAMPLE_ENTRY.date);
  await expect(page.getByTestId('day-tracker')).toHaveAccessibleName(/Score 7 of 10, 1 of 1 habits done/);
  await page.getByTestId('day-tracker').click();
  await expect(panel.getByRole('radio', { name: '7 of 10' })).toHaveAttribute('aria-checked', 'true');
  await expect(panel.getByRole('button', { name: /^Streak for Morning run: 40 days/ })).toBeVisible();
});

test('clearing a missed habit removes its status glyph immediately', async ({ page }) => {
  await importPlainIcs(page, diaryIcs([SAMPLE_ENTRY], SAMPLE_TRACKER));
  await openDay(page, SAMPLE_ENTRY.date);
  await page.getByTestId('day-tracker').click();
  const habit = page.getByRole('button', { name: /^Read 20 pages:/ });

  await habit.click();
  await expect(habit).toHaveAccessibleName(/^Read 20 pages: done/);
  await habit.click();
  await expect(habit).toHaveAccessibleName(/^Read 20 pages: missed/);
  await habit.click();
  await expect(habit).toHaveAccessibleName(/^Read 20 pages: not marked/);
  // The empty ring must not briefly show the done tick as its colour fades.
  await expect(habit.locator('svg')).toHaveCount(0);
});

test('leaving the streak field for another one keeps focus there', async ({ page }) => {
  await importPlainIcs(page, diaryIcs([SAMPLE_ENTRY], SAMPLE_TRACKER));
  await openDay(page, SAMPLE_ENTRY.date);
  await page.getByTestId('day-tracker').click();
  const panel = page.getByRole('dialog', { name: 'Score and habits' });

  await panel.getByRole('button', { name: /^Streak for Morning run/ }).click();
  const streak = panel.getByRole('textbox', { name: /^Streak for Morning run/ });
  await streak.fill('12');

  // Moving on to the New habit field commits the number without pulling focus back.
  const newHabit = panel.getByRole('textbox', { name: 'New habit' });
  await newHabit.click();
  await page.keyboard.type('Stretch');
  await expect(newHabit).toHaveValue('Stretch');
  await expect(panel.getByRole('button', { name: /^Streak for Morning run: 12 days, set by hand/ })).toBeVisible();

  // Enter still hands focus back to the number it replaced.
  await panel.getByRole('button', { name: /^Streak for Morning run/ }).click();
  await panel.getByRole('textbox', { name: /^Streak for Morning run/ }).press('Enter');
  await expect(panel.getByRole('button', { name: /^Streak for Morning run/ })).toBeFocused();
});

/** The centre of `locator` on screen. */
async function centre(locator: Locator): Promise<[number, number]> {
  const box = (await locator.boundingBox())!;
  return [box.x + box.width / 2, box.y + box.height / 2];
}

test('drags the sun along the track with the mouse', async ({ page }) => {
  await importPlainIcs(page, diaryIcs([SAMPLE_ENTRY]));
  await openDay(page, SAMPLE_ENTRY.date);
  await page.getByTestId('day-tracker').click();
  const track = page.getByRole('radiogroup', { name: 'Score' });

  await track.getByRole('radio', { name: '3 of 10' }).click();
  const [x, y] = await centre(track.getByRole('radio', { name: '3 of 10' }));
  const [toX] = await centre(track.getByRole('radio', { name: '8 of 10' }));
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(toX, y, { steps: 6 });
  await page.mouse.up();
  await expect(track.getByRole('radio', { name: '8 of 10' })).toHaveAttribute('aria-checked', 'true');

  // Letting go over a number isn't a tap on it: the score stays.
  await expect(page.getByTestId('day-tracker')).toHaveAccessibleName(/Score 8 of 10/);
});

test.describe('on a phone', () => {
  const { defaultBrowserType: _, ...pixel } = devices['Pixel 7'];
  test.use(pixel);

  test('drags the sun with a finger', async ({ page, context }) => {
    await importPlainIcs(page, diaryIcs([SAMPLE_ENTRY]));
    await page.getByRole('region', { name: 'Entries' }).getByRole('listitem').getByRole('button').first().click();
    await page.getByTestId('day-tracker').click();
    const track = page.getByRole('radiogroup', { name: 'Score' });
    // Let the sheet finish sliding up before dragging across it.
    await page.waitForTimeout(400);

    const cdp = await context.newCDPSession(page);
    const from = await centre(track.getByRole('radio', { name: '2 of 10' }));
    const to = await centre(track.getByRole('radio', { name: '9 of 10' }));
    await touchDrag(cdp, from, to);
    await expect(track.getByRole('radio', { name: '9 of 10' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('ticks for scores and habit marks and remembers when disabled', async ({ page, context }) => {
    const ticks: number[] = [];
    await page.exposeFunction('recordVibration', (duration: number) => ticks.push(duration));
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'vibrate', {
        value: (duration: number) => {
          void (window as unknown as { recordVibration: (ms: number) => Promise<void> }).recordVibration(duration);
          return true;
        },
      });
    });
    await importPlainIcs(page, diaryIcs([SAMPLE_ENTRY], SAMPLE_TRACKER));
    await openDay(page, SAMPLE_ENTRY.date);
    await page.getByTestId('day-tracker').click();
    const track = page.getByRole('radiogroup', { name: 'Score' });
    await page.waitForTimeout(400);

    const cdp = await context.newCDPSession(page);
    const from = await centre(track.getByRole('radio', { name: '2 of 10' }));
    const to = await centre(track.getByRole('radio', { name: '9 of 10' }));
    await touchDrag(cdp, from, to, 240);
    await expect.poll(() => ticks).toEqual(Array(7).fill(10));
    await touchDrag(cdp, to, from, 240);
    await expect.poll(() => ticks).toHaveLength(14);

    // Tapping selects or clears a score, with exactly one tick each time.
    await page.touchscreen.tap(...to);
    await expect(track.getByRole('radio', { name: '9 of 10' })).toHaveAttribute('aria-checked', 'true');
    await expect.poll(() => ticks).toHaveLength(15);
    await page.touchscreen.tap(...to);
    await expect(track.getByRole('radio', { name: '9 of 10' })).toHaveAttribute('aria-checked', 'false');
    await expect.poll(() => ticks).toHaveLength(16);

    // Mouse dragging and arrow keys do not add ticks.
    await page.mouse.move(...from);
    await page.mouse.down();
    await page.mouse.move(to[0], to[1], { steps: 8 });
    await page.mouse.up();
    await track.getByRole('radio', { name: '9 of 10' }).press('ArrowLeft');
    expect(ticks).toHaveLength(16);

    // Every habit state change gives one tick, including clearing the mark.
    await page.getByRole('button', { name: /^Read 20 pages: not marked/ }).tap();
    await page.getByRole('button', { name: /^Read 20 pages: done/ }).tap();
    await page.getByRole('button', { name: /^Read 20 pages: missed/ }).tap();
    await expect.poll(() => ticks).toHaveLength(19);

    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Settings' });
    const toggle = settings.getByRole('switch', { name: 'Haptic feedback' });
    await expect(toggle).toBeChecked();
    await toggle.click();
    await expect(toggle).not.toBeChecked();
    await settings.getByRole('button', { name: 'Close', exact: true }).click();

    await page.getByTestId('day-tracker').click();
    await track.getByRole('radio', { name: '9 of 10' }).tap();
    await expect(track.getByRole('radio', { name: '9 of 10' })).toHaveAttribute('aria-checked', 'true');
    await track.getByRole('radio', { name: '9 of 10' }).tap();
    await expect(track.getByRole('radio', { name: '9 of 10' })).toHaveAttribute('aria-checked', 'false');
    await page.getByRole('button', { name: /^Read 20 pages: not marked/ }).tap();
    await expect(page.getByRole('button', { name: /^Read 20 pages: done/ })).toBeVisible();
    expect(ticks).toHaveLength(19);

    await expect(page.getByRole('progressbar', { name: 'Working' })).toHaveCount(0);
    await page.reload();
    await openDay(page, SAMPLE_ENTRY.date);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(toggle).not.toBeChecked();
    await settings.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByTestId('day-tracker').click();
    await page.waitForTimeout(400);
    await touchDrag(
      cdp,
      await centre(track.getByRole('radio', { name: '2 of 10' })),
      await centre(track.getByRole('radio', { name: '9 of 10' })),
      240,
    );
    await expect(track.getByRole('radio', { name: '9 of 10' })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('button', { name: /^Read 20 pages: done/ }).tap();
    await expect(page.getByRole('button', { name: /^Read 20 pages: missed/ })).toBeVisible();
    expect(ticks).toHaveLength(19);
  });
});

test('scores the day being written without leaving the editor', async ({ page }) => {
  await importPlainIcs(page, diaryIcs([SAMPLE_ENTRY]));
  await openDay(page, SAMPLE_ENTRY.date);
  await page.getByRole('button', { name: 'Edit entry' }).click();
  await page.locator('.ProseMirror').waitFor();

  // R is for writing here, not a shortcut.
  await page.locator('.ProseMirror').press('End');
  await page.keyboard.type(' Really');
  await expect(page.locator('.ProseMirror')).toContainText('Really');
  await expect(page.getByRole('dialog', { name: 'Score and habits' })).toBeHidden();

  await page.getByTestId('day-tracker').click();
  await page.getByRole('radio', { name: '9 of 10' }).click();
  await page.keyboard.press('Escape');
  // Escape closed only the popover: still writing.
  await expect(page.locator('.ProseMirror')).toBeVisible();
  await expect(page.getByTestId('day-tracker')).toHaveAccessibleName(/Score 9 of 10/);
});

test('shows how many days in a row passed, until turned off', async ({ page }) => {
  await importPlainIcs(page, diaryIcs([SAMPLE_ENTRY], SAMPLE_TRACKER));
  await openDay(page, SAMPLE_ENTRY.date);
  const tracker = page.getByTestId('day-tracker');
  await expect(tracker).toHaveAccessibleName(/Passed 3 days in a row/);
  await expect(tracker.getByTestId('pass-run')).toHaveText('3');

  // A pass mark above every score turns it into a failing run.
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await page.getByRole('button', { name: 'Settings' }).click();
  await settings.getByRole('button', { name: 'Pass mark' }).click();
  await page.getByRole('option', { name: '9 or more' }).click();
  await expect(tracker).toHaveAccessibleName(/Failed 3 days in a row/);

  await settings.getByRole('switch', { name: 'Pass streak' }).click();
  await expect(settings.getByRole('button', { name: 'Pass mark' })).toBeHidden();
  await settings.getByRole('button', { name: 'Close' }).click();
  await expect(tracker.getByTestId('pass-run')).toBeHidden();
  await expect(tracker).not.toHaveAccessibleName(/in a row/);
});

test('a long list of habits scrolls inside the popover', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 640 });
  const habits = Array.from({ length: 24 }, (_, i) => ({ id: `h${i}`, name: `Habit ${i + 1}` }));
  await importPlainIcs(page, diaryIcs([SAMPLE_ENTRY], { ...SAMPLE_TRACKER, habits }));
  await openDay(page, SAMPLE_ENTRY.date);
  await page.getByTestId('day-tracker').click();
  const panel = page.getByRole('dialog', { name: 'Score and habits' });

  const box = (await panel.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(640);
  // The last habit and the field after it can still be reached.
  await panel.getByRole('button', { name: /^Habit 24: not marked/ }).click();
  await panel.getByRole('textbox', { name: 'New habit' }).fill('Stretch');
});
