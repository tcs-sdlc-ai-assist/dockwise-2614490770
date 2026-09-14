/**
 * E2E spec for reports: search and the dashboard.
 *
 * Run in the TESTING phase against live servers.
 */
import { test, expect } from '@playwright/test';
import {
  captureConsoleErrors,
  expectNoConsoleErrors,
  signIn,
} from './helpers';

test.describe('reports', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'site.admin@dockwise.example');
  });

  test('site admin can open search and run a query', async ({ page }) => {
    const errors = captureConsoleErrors(page);
    await page.getByRole('link', { name: /^search$/i }).click();
    await expect(
      page.getByRole('heading', { name: /search visits/i }),
    ).toBeVisible();
    await page.getByLabel(/site/i).selectOption({ index: 1 });
    await page.getByRole('button', { name: /^search$/i }).click();
    await expect(
      page.getByRole('heading', { name: /results/i }),
    ).toBeVisible();
    expectNoConsoleErrors(errors);
  });

  test('site admin can view the dashboard', async ({ page }) => {
    const errors = captureConsoleErrors(page);
    await page.getByRole('link', { name: /dashboard/i }).click();
    await expect(
      page.getByRole('heading', { name: /^dashboard$/i }),
    ).toBeVisible();
    await page.getByLabel(/site/i).selectOption({ index: 1 });
    await expect(page.getByText(/on-time arrival/i)).toBeVisible();
    expectNoConsoleErrors(errors);
  });
});
