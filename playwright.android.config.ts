import { defineConfig } from '@playwright/test';

/**
 * Android smoke test (`e2e/android/`). It drives an app already installed on
 * a running emulator over adb, so there is no web server or browser to start.
 */
export default defineConfig({
  testDir: './e2e/android',
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
});
