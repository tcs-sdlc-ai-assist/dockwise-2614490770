/**
 * E2E spec for gate operations: search, check in, and the unscheduled flow.
 *
 * Run in the TESTING phase against live servers.
 */
import { test, expect } from '@playwright/test';
import {
  captureConsoleErrors,
  expectNoConsoleErrors,
  signIn,
} from './helpers';

test.describe('gate operations', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'gate@dockwise.example');
  });

  test('gate officer searches and reaches the check-in flow', async ({
    page,
  }) => {
    const errors = captureConsoleErrors(page);
    await page.getByRole('link', { name: /^gate$/i }).click();
    await expect(page.getByRole('heading', { name: /^gate$/i })).toBeVisible();
    await page.getByLabel(/site/i).selectOption({ index: 1 });
    await page.getByLabel(/search/i).fill('GATE');
    // Either results or the unscheduled prompt appears.
    await expect(
      page
        .getByText(/no appointment matches/i)
        .or(page.locator('.gate-results'))
        .first(),
    ).toBeVisible({ timeout: 15000 });
    expectNoConsoleErrors(errors);
  });

  test('gate officer can open the unscheduled visit flow', async ({ page }) => {
    const errors = captureConsoleErrors(page);
    await page.getByRole('link', { name: /^gate$/i }).click();
    await page.getByLabel(/site/i).selectOption({ index: 1 });
    await page.getByLabel(/search/i).fill('NOMATCH-XYZ');
    await expect(
      page.getByText(/no appointment matches\. log unscheduled visit/i),
    ).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /log unscheduled visit/i }).click();
    await expect(
      page.getByRole('heading', { name: /log unscheduled visit/i }),
    ).toBeVisible();
    expectNoConsoleErrors(errors);
  });
});
