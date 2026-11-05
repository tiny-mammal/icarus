import { devices, expect, test, type Locator } from '@playwright/test';
import { startPlainDiary } from './helpers';

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

    async function expectClosed(trigger: Locator, popover: Locator): Promise<void> {
      await expect(popover).toBeHidden();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    }

    test('month picker closes from its chevron and label', async ({ page }) => {
      await startPlainDiary(page);
      const trigger = page.locator('button[aria-haspopup="dialog"]').filter({ hasText: /\d{4}/ });
      const picker = page.getByRole('dialog', { name: 'Select month and year' });

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

      await press(trigger);
      await press(page.getByPlaceholder('Search entries…'));
      await expectClosed(trigger, picker);

      await trigger.focus();
      await page.keyboard.press('Enter');
      await expect(picker).toBeVisible();
      await page.keyboard.press('Escape');
      await expectClosed(trigger, picker);
      await expect(trigger).toBeFocused();
    });

    test('date picker closes from its trigger', async ({ page }) => {
      await startPlainDiary(page);
      await page.getByRole('button', { name: 'New entry', exact: true }).click();
      const pane = page.getByRole('complementary');
      const trigger = pane.locator('button[aria-haspopup="dialog"]').filter({ hasText: /\d{4}/ });
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
      await press(pane.getByText('New entry', { exact: true }));
      await expectClosed(trigger, picker);
    });

    test('drafts menu closes from its trigger', async ({ page }) => {
      await startPlainDiary(page);
      await page.getByRole('button', { name: 'New entry', exact: true }).click();
      await page.getByPlaceholder('Title', { exact: true }).fill('Popover regression');
      await page.getByRole('button', { name: 'Save as draft' }).click();
      await expect(page.getByRole('complementary')).toBeHidden();
      const trigger = page.getByRole('banner').getByRole('button', { name: 'Drafts', exact: true });
      const menu = page.getByRole('dialog', { name: 'Saved drafts' });

      await press(trigger);
      await expect(menu.getByText('Popover regression')).toBeVisible();
      await press(trigger);
      await expectClosed(trigger, menu);

      await press(trigger);
      await press(page.getByPlaceholder('Search entries…'));
      await expectClosed(trigger, menu);
    });
  });
}
