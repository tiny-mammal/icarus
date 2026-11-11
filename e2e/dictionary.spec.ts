import { devices, expect, test, type Page } from '@playwright/test';
import { startPlainDiary } from './helpers';

for (const touch of [false, true]) {
  test.describe(touch ? 'touch dictionary' : 'mouse dictionary', () => {
    if (touch) {
      const { defaultBrowserType: _, ...pixel } = devices['Pixel 7'];
      test.use(pixel);
    }

    const settings = (page: Page) => page.getByRole('dialog', { name: 'Settings' });
    const dictionary = (page: Page) => page.getByRole('dialog', { name: 'Personal dictionary' });

    async function openDictionary(page: Page) {
      await page.getByRole('button', { name: 'Settings' }).click();
      await settings(page).getByRole('button', { name: /^Personal dictionary/ }).click();
      await expect(dictionary(page)).toBeVisible();
    }

    /** Type a misspelled word in a new entry and add it from the spelling menu. */
    async function addFromEditor(page: Page, typo: string) {
      await page.getByRole('button', { name: 'New entry', exact: true }).click();
      const body = page.locator('.ProseMirror');
      await body.fill(`We saw a ${typo} today`);
      const word = body.locator('.spell-misspelled', { hasText: typo });
      await expect(word).toBeVisible();
      await word.evaluate((el) => {
        const r = el.getBoundingClientRect();
        el.dispatchEvent(new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: r.x + r.width / 2,
          clientY: r.y + r.height / 2,
        }));
      });
      await page.getByRole('menuitem', { name: 'Add to dictionary' }).click();
      await expect(word).toBeHidden();
      return word;
    }

    test('adding a word from the editor says so and can be undone', async ({ page }) => {
      await startPlainDiary(page);
      const word = await addFromEditor(page, 'zorblax');

      const toasts = page.getByRole('region', { name: 'Notifications' });
      await expect(toasts).toContainText('Added “zorblax” to your dictionary');
      await toasts.getByRole('button', { name: 'Undo' }).click();
      await expect(word).toBeVisible();
      // Undoing is quiet: no second toast announcing the removal.
      await expect(toasts).not.toContainText('Removed');
    });

    // Phones show the editor full screen, over the top bar and so Settings.
    test('a word taught in the editor can be taken back from Settings', async ({ page }) => {
      test.skip(touch, 'the editor covers Settings on phones');
      await startPlainDiary(page);
      const word = await addFromEditor(page, 'zorblax');

      await page.getByRole('button', { name: 'Settings' }).click();
      await expect(settings(page).getByRole('button', { name: /^Personal dictionary/ })).toContainText('1 word added');
      await settings(page).getByRole('button', { name: /^Personal dictionary/ }).click();
      const list = dictionary(page).getByRole('list', { name: 'Words in your dictionary' });
      await expect(list.getByRole('listitem')).toHaveText(['zorblax']);

      // Removing it brings the underline back in the open editor.
      await list.getByRole('button', { name: 'Remove zorblax' }).click();
      await expect(word).toBeVisible();
    });

    test('words can be typed in, removed and brought back', async ({ page }) => {
      await startPlainDiary(page);
      await openDictionary(page);
      const field = dictionary(page).getByRole('textbox', { name: 'Add a word' });
      const list = dictionary(page).getByRole('list', { name: 'Words in your dictionary' });

      await field.fill('zorblax');
      await field.press('Enter');
      await field.fill('quuxify');
      await field.press('Enter');
      await expect(list.getByRole('listitem')).toHaveText(['quuxify', 'zorblax']);
      await expect(field).toHaveValue('');
      await page.screenshot({ path: `test-results/dictionary-${touch ? 'touch' : 'mouse'}.png` });

      // They are saved: still there after a reload, with no error shown.
      await page.reload();
      await openDictionary(page);
      await expect(list.getByRole('listitem')).toHaveText(['quuxify', 'zorblax']);
      await expect(page.getByRole('alert')).toBeHidden();

      // One word at a time, and each only once.
      await field.fill('two words');
      await field.press('Enter');
      await expect(dictionary(page).getByRole('alert')).toContainText('single word');
      await field.fill('Quuxify');
      await expect(dictionary(page).getByRole('alert')).toBeHidden();
      await field.fill('quuxify');
      await field.press('Enter');
      await expect(dictionary(page).getByRole('alert')).toContainText('already in your dictionary');

      // Removing a word can be undone.
      await list.getByRole('button', { name: 'Remove quuxify' }).click();
      await expect(list.getByRole('listitem')).toHaveText(['zorblax']);
      await page.getByRole('region', { name: 'Notifications' }).getByRole('button', { name: 'Undo' }).click();
      await expect(list.getByRole('listitem')).toHaveText(['quuxify', 'zorblax']);

      // Closing returns to Settings, which still counts them.
      await dictionary(page).getByRole('button', { name: 'Back to Settings' }).click();
      await expect(dictionary(page)).toBeHidden();
      await expect(settings(page).getByRole('button', { name: /^Personal dictionary/ })).toContainText('2 words added');
    });

    test('an empty dictionary says how to fill it', async ({ page }) => {
      await startPlainDiary(page);
      await openDictionary(page);
      await expect(dictionary(page).getByText('No words yet.')).toBeVisible();
      await expect(dictionary(page).getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
      await page.screenshot({ path: `test-results/dictionary-empty-${touch ? 'touch' : 'mouse'}.png` });
    });
  });
}
