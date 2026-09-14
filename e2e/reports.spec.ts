/**
 * E2E spec for reports: search and the dashboard.
 *
 * Run in the TESTING phase against live servers.
 */
import { test, expect } from '@playwright/test';

test.describe('reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('site.admin@dockwise.example');
    await page.getByLabel(/password/i).fill('DockwiseDemo!1');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/app/);
  });

  test('site admin can open search and run a query', async ({ page }) => {
    await page.goto('/search');
    await expect(
      page.getByRole('heading', { name: /search visits/i }),
    ).toBeVisible();
    await page.getByLabel(/site/i).selectOption({ index: 1 });
    await page.getByRole('button', { name: /^search$/i }).click();
    await expect(
      page.getByRole('heading', { name: /results/i }),
    ).toBeVisible();
  });

  test('site admin can view the dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(
      page.getByRole('heading', { name: /^dashboard$/i }),
    ).toBeVisible();
    await page.getByLabel(/site/i).selectOption({ index: 1 });
    await expect(page.getByText(/on-time arrival/i)).toBeVisible();
  });
});
