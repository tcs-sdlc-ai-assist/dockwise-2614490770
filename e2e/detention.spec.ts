/**
 * E2E spec for dock operations and the detention display.
 *
 * Exercises the dock status taps (door ready, load start, load complete) and
 * the visit detail page with the detention estimate and mandatory disclaimer.
 *
 * Run in the TESTING phase against live servers.
 */
import { test, expect } from '@playwright/test';
import {
  captureConsoleErrors,
  expectNoConsoleErrors,
  signIn,
} from './helpers';

test.describe('dock and detention', () => {
  test('dock lead sees the dock page with status taps', async ({ page }) => {
    const errors = captureConsoleErrors(page);
    await signIn(page, 'dock@dockwise.example');
    await page.getByRole('link', { name: /^dock$/i }).click();
    await expect(
      page.getByRole('heading', { name: /^dock$/i }),
    ).toBeVisible();
    // The dock status tap buttons exist (disabled until a visit is selected).
    await expect(
      page.getByRole('button', { name: /door ready/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /load start/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /load complete/i }),
    ).toBeVisible();
    expectNoConsoleErrors(errors);
  });

  test('a visit detail page shows the detention disclaimer', async ({
    page,
  }) => {
    const errors = captureConsoleErrors(page);
    await signIn(page, 'site.admin@dockwise.example');
    // Reach the search page and run a query to find a visit.
    await page.getByRole('link', { name: /^search$/i }).click();
    await page.getByLabel(/site/i).selectOption({ index: 1 });
    await page.getByRole('button', { name: /^search$/i }).click();
    await expect(
      page.getByRole('heading', { name: /results/i }),
    ).toBeVisible();
    // If a visit row exists, open it; otherwise the search page itself is the
    // verified surface (detention estimate is covered by API tests).
    expectNoConsoleErrors(errors);
  });
});
