import { devices, expect, test, type Locator, type Page } from '@playwright/test';
import { hideToasts, startPlainDiary, openSearch, searchResult } from './helpers';

for (const touch of [false, true]) {
  test.describe(touch ? 'touch popovers' : 'mouse popovers', () => {
    if (touch) {
      const { defaultBrowserType: _, ...pixel } = devices['Pixel 7'];
      test.use(pixel);
    }

    async function press(target: Locator): Promise<void> {
      if (touch) await target.tap();
      else await target.click();
    }

    // Phones keep the calendar, and so its month picker, in a sheet over the feed.
    async function monthPicker(page: Page): Promise<{ trigger: Locator; picker: Locator }> {
      let scope: Page | Locator = page;
      if (touch) {
        await press(page.getByRole('button', { name: /open calendar$/ }));
        scope = page.getByRole('dialog', { name: 'Calendar' });
      }
      return {
        trigger: scope.locator('button[aria-haspopup="dialog"]').filter({ hasText: /\d{4}/ }),
        picker: page.getByRole('dialog', { name: 'Select month and year' }),
      };
    }

    async function expectClosed(trigger: Locator, popover: Locator): Promise<void> {
      await expect(popover).toBeHidden();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    }

    test('month picker closes from its chevron and label', async ({ page }) => {
      await startPlainDiary(page);
      const { trigger, picker } = await monthPicker(page);

      // The SVG is part of the trigger, even though it is outside the dialog.
      for (const target of [trigger.locator('svg'), trigger]) {
        await press(target);
        await expect(picker).toBeVisible();
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await press(target);
        await expectClosed(trigger, picker);
      }

      await press(trigger);
      await press(picker.getByRole('button', { name: 'Next year' }));
      await expect(picker).toBeVisible();
      await press(picker.getByRole('button', { name: 'Jan', exact: true }));
      await expectClosed(trigger, picker);
      await expect(trigger).toContainText('January');

      // The search sits under the calendar sheet on phones.
      if (!touch) {
        await press(trigger);
        await openSearch(page, press);
        await expectClosed(trigger, picker);
      }

      await trigger.focus();
      await page.keyboard.press('Enter');
      await expect(picker).toBeVisible();
      await page.keyboard.press('Escape');
      await expectClosed(trigger, picker);
      await expect(trigger).toBeFocused();
    });

    test('Escape closes a popover the moment it opens', async ({ page }) => {
      await startPlainDiary(page);
      // Freeze animation frames: nothing deferred may be needed to close it.
      await page.evaluate(() => {
        window.requestAnimationFrame = () => 0;
      });
      const { trigger, picker } = await monthPicker(page);

      await trigger.focus();
      await page.keyboard.press('Enter');
      await expect(picker).toBeVisible();
      await page.keyboard.press('Escape');
      await expectClosed(trigger, picker);
    });

    test('date picker closes from its trigger', async ({ page }) => {
      await startPlainDiary(page);
      await page.getByRole('button', { name: 'New entry', exact: true }).click();
      const pane = page.getByRole('complementary');
      const trigger = pane.getByRole('button', { name: /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), / });
      const picker = page.getByRole('dialog', { name: 'Pick a date' });

      await press(trigger);
      await expect(picker).toBeVisible();
      await press(trigger);
      await expectClosed(trigger, picker);

      await press(trigger);
      await press(picker.getByRole('button', { name: 'Next month' }));
      await expect(picker).toBeVisible();
      await press(picker.getByRole('button', { name: 'Today', exact: true }));
      await expectClosed(trigger, picker);

      await press(trigger);
      await press(pane.getByTestId('entry-status')); // outside, and never under the picker
      await expectClosed(trigger, picker);
    });

    test('drafts menu closes from its trigger', async ({ page }) => {
      await startPlainDiary(page);
      await page.getByRole('button', { name: 'New entry', exact: true }).click();
      await page.getByPlaceholder('Title', { exact: true }).fill('Popover regression');
      await page.getByRole('button', { name: 'Stop editing' }).click();
      await expect(page.getByRole('complementary')).toBeHidden();
      const trigger = page.getByRole('banner').getByRole('button', { name: 'Drafts', exact: true });
      const menu = page.getByRole('dialog', { name: 'Saved drafts' });

      await press(trigger);
      await expect(menu.getByText('Popover regression')).toBeVisible();
      // The list stays on-screen, even on phones where the trigger sits mid-bar.
      const box = await menu.boundingBox();
      const width = page.viewportSize()!.width;
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      await press(trigger);
      await expectClosed(trigger, menu);

      await press(trigger);
      await openSearch(page, press);
      await expectClosed(trigger, menu);
    });

    test('top bar popovers stay above the open day pane', async ({ page }) => {
      await startPlainDiary(page);
      await page.getByRole('button', { name: 'New entry', exact: true }).click();
      await page.getByPlaceholder('Title', { exact: true }).fill('Read me');
      await page.getByRole('button', { name: 'Save entry' }).click();
      await page.getByRole('button', { name: 'New entry', exact: true }).click();
      await page.getByPlaceholder('Title', { exact: true }).fill('Layering regression');
      await page.getByRole('button', { name: 'Stop editing' }).click();
      // Read a saved entry: the pane stays open and the top bar keeps Drafts.
      await (await openSearch(page)).fill('Read me');
      await searchResult(page, 'Read me').click();
      await expect(page.getByRole('complementary').getByRole('article')).toContainText('Read me');

      await hideToasts(page);

      // A popover is on top when the point at its centre hits it, not the pane.
      async function expectOnTop(popover: Locator): Promise<void> {
        await expect(popover).toBeVisible();
        const onTop = await popover.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return !!hit && el.contains(hit) ? 'ok' : `${el.outerHTML.slice(0, 60)} -> ${hit?.outerHTML.slice(0, 160)}`;
        });
        expect(onTop).toBe('ok');
      }

      const drafts = page.getByRole('banner').getByRole('button', { name: 'Drafts', exact: true });
      await press(drafts);
      await expectOnTop(page.getByRole('dialog', { name: 'Saved drafts' }));
      await press(drafts);

      await (await openSearch(page)).fill('zzzz');
      await expectOnTop(page.getByText('No matching entries'));
    });

    test('spelling menu drops the long-press selection so its handles do not cover it', async ({ page }) => {
      await startPlainDiary(page);
      await page.getByRole('button', { name: 'New entry', exact: true }).click();
      const body = page.locator('.ProseMirror');
      await body.fill('Hello toos');
      const word = body.locator('.spell-misspelled', { hasText: 'toos' });
      await expect(word).toBeVisible();

      // A touch long-press selects the word natively, then fires contextmenu.
      await word.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        getSelection()!.removeAllRanges();
        getSelection()!.addRange(range);
        const r = el.getBoundingClientRect();
        el.dispatchEvent(new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: r.x + r.width / 2,
          clientY: r.y + r.height / 2,
        }));
      });

      await expect(page.getByRole('menu', { name: 'Spelling suggestions' })).toBeVisible();
      expect(await page.evaluate(() => getSelection()?.isCollapsed ?? true)).toBe(true);
    });
  });
}
