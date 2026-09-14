/**
 * E2E spec for the live board: select a site and see the four columns.
 *
 * Run in the TESTING phase against live servers.
 */
import { test, expect } from '@playwright/test';
import {
  captureConsoleErrors,
  expectNoConsoleErrors,
  signIn,
} from './helpers';

test.describe('live board', () => {
  test('coordinator sees the four board columns', async ({ page }) => {
    const errors = captureConsoleErrors(page);
    await signIn(page, 'coordinator@dockwise.example');
    await page.getByRole('link', { name: /live board/i }).click();
    await expect(
      page.getByRole('heading', { name: /live board/i }),
    ).toBeVisible();

    await page.getByLabel(/site/i).selectOption({ index: 1 });

    await expect(
      page.getByRole('heading', { name: /upcoming \(2h\)/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /in yard/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /at door/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /exceptions/i }),
    ).toBeVisible();
    expectNoConsoleErrors(errors);
  });
});
